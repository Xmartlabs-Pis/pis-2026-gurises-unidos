'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/audit-log';
import { METRIC_DEFINITIONS } from '@/lib/metrics/constants';
import { getMetricYears } from '@/lib/metrics/queries';
import { getCurrentYear } from '@/lib/metrics/year';

const METRIC_SETTINGS_SCHEMA = z.object({
  publishedYears: z
    .array(z.number().int())
    .min(1)
    .refine((years) => new Set(years).size === years.length),
  topics: z
    .array(z.object({ id: z.number().int().positive(), showPublicly: z.boolean() }))
    .refine((topics) => new Set(topics.map(({ id }) => id)).size === topics.length)
    .default([]),
  metrics: z
    .array(
      z.object({
        key: z.string().refine((key) => METRIC_DEFINITIONS.some((metric) => metric.key === key)),
        showPublicly: z.boolean(),
      })
    )
    .length(METRIC_DEFINITIONS.length)
    .refine(
      (metrics) => new Set(metrics.map((metric) => metric.key)).size === METRIC_DEFINITIONS.length
    ),
});

type AuditChange = { field: string; from: boolean; to: boolean };

function sameYears(a: number[], b: number[]) {
  return a.length === b.length && a.every((year, index) => year === b[index]);
}

export async function saveMetricSettings(input: unknown) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, message: 'No tenés permisos para guardar las métricas.' };
  }

  const result = METRIC_SETTINGS_SCHEMA.safeParse(input);
  if (!result.success) {
    return { success: false, message: 'La selección de métricas no es válida.' };
  }

  const { publishedYears, metrics, topics } = result.data;
  const availableYears = await getMetricYears(getCurrentYear());
  const unavailableYears = publishedYears.filter((year) => !availableYears.includes(year));
  if (unavailableYears.length) {
    return {
      success: false,
      message: `Estos años ya no están disponibles: ${unavailableYears.join(', ')}. Recargá la página para actualizar la selección.`,
    };
  }
  const sortedYears = [...publishedYears].sort((a, b) => b - a);

  try {
    await prisma.$transaction(async (tx) => {
      const selectedTopics = topics.length
        ? await tx.topic.findMany({
            where: { id: { in: topics.map(({ id }) => id) }, isActive: true },
            select: { id: true, name: true, showPublicly: true },
          })
        : [];
      if (selectedTopics.length !== topics.length) throw new Error('Invalid topic selection');
      const authorId = Number(session.user.id);
      const previousSettings = await tx.publicSettings.findUnique({ where: { id: 1 } });
      const previousYears = previousSettings?.publishedYears ?? availableYears;
      await tx.publicSettings.upsert({
        where: { id: 1 },
        create: { id: 1, publishedYears: sortedYears, updatedBy: authorId },
        update: { publishedYears: sortedYears, updatedBy: authorId },
      });
      if (!sameYears(previousYears, sortedYears)) {
        await logAudit(tx, {
          authorId,
          action: 'update',
          entity: 'publicSettings',
          entityId: 1,
          details: {
            changes: [{ field: 'publishedYears', from: previousYears, to: sortedYears }],
          },
        });
      }
      const metricChanges: AuditChange[] = [];
      const previousMetrics = await tx.metric.findMany({
        select: { key: true, showPublicly: true },
      });
      for (const [index, definition] of METRIC_DEFINITIONS.entries()) {
        const showPublicly = metrics.find((metric) => metric.key === definition.key)!.showPublicly;
        const previousShowPublicly =
          previousMetrics.find((metric) => metric.key === definition.key)?.showPublicly ??
          definition.showPublicly;
        await tx.metric.upsert({
          where: { key: definition.key },
          create: {
            key: definition.key,
            name: definition.name,
            sortOrder: index,
            showPublicly,
            updatedBy: authorId,
          },
          update: { showPublicly, updatedBy: authorId },
        });
        if (previousShowPublicly !== showPublicly) {
          metricChanges.push({
            field: definition.name,
            from: previousShowPublicly,
            to: showPublicly,
          });
        }
      }
      if (metricChanges.length) {
        await logAudit(tx, {
          authorId,
          action: 'update',
          entity: 'metric',
          details: { changes: metricChanges },
        });
      }
      const topicChanges: AuditChange[] = [];
      for (const topic of selectedTopics) {
        const showPublicly = topics.find(({ id }) => id === topic.id)!.showPublicly;
        if (topic.showPublicly === showPublicly) continue;
        await tx.topic.update({
          where: { id: topic.id },
          data: { showPublicly },
        });
        topicChanges.push({ field: topic.name, from: topic.showPublicly, to: showPublicly });
      }
      if (topicChanges.length) {
        await logAudit(tx, {
          authorId,
          action: 'update',
          entity: 'topic',
          details: { changes: topicChanges },
        });
      }
    });
  } catch {
    return { success: false, message: 'No se pudieron guardar los cambios. Intentá de nuevo.' };
  }

  revalidatePath('/management/metrics');
  revalidatePath('/');
  return { success: true, message: 'Cambios guardados.' };
}
