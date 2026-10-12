'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/audit-log';
import { METRIC_DEFINITIONS } from '@/lib/metrics/constants';
import { getMetricYears } from '@/lib/metrics/queries';
import { getTopicMetricKey } from '@/lib/metrics/topic-statistics';

const METRIC_SETTINGS_SCHEMA = z.object({
  year: z.number().int(),
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

export async function saveMetricSettings(input: unknown) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'admin') {
    return { success: false, message: 'No tenés permisos para guardar las métricas.' };
  }

  const result = METRIC_SETTINGS_SCHEMA.safeParse(input);
  if (!result.success) {
    return { success: false, message: 'La selección de métricas no es válida.' };
  }

  const { year, metrics, topics } = result.data;
  const availableYears = await getMetricYears(new Date().getFullYear());
  if (!availableYears.includes(year)) {
    return { success: false, message: 'El año de referencia no es válido.' };
  }

  try {
    await prisma.$transaction(async (tx) => {
      const selectedTopics = topics.length
        ? await tx.topic.findMany({
            where: { id: { in: topics.map(({ id }) => id) }, isActive: true },
            select: { id: true, name: true },
          })
        : [];
      if (selectedTopics.length !== topics.length) throw new Error('Invalid topic selection');
      await tx.publicSettings.upsert({
        where: { id: 1 },
        create: { id: 1, referenceYear: year, updatedBy: Number(session.user.id) },
        update: { referenceYear: year, updatedBy: Number(session.user.id) },
      });
      for (const [index, definition] of METRIC_DEFINITIONS.entries()) {
        const showPublicly = metrics.find((metric) => metric.key === definition.key)!.showPublicly;
        const metric = await tx.metric.upsert({
          where: { key: definition.key },
          create: {
            key: definition.key,
            name: definition.name,
            sortOrder: index,
            showPublicly,
            updatedBy: Number(session.user.id),
          },
          update: { showPublicly, updatedBy: Number(session.user.id) },
        });
        await logAudit(tx, {
          authorId: Number(session.user.id),
          action: 'update',
          entity: 'metric',
          entityId: metric.id,
        });
      }
      for (const topic of selectedTopics) {
        const showPublicly = topics.find(({ id }) => id === topic.id)!.showPublicly;
        const metric = await tx.metric.upsert({
          where: { key: getTopicMetricKey(topic.id) },
          create: {
            key: getTopicMetricKey(topic.id),
            name: topic.name,
            sortOrder: METRIC_DEFINITIONS.length + topic.id,
            showPublicly,
            updatedBy: Number(session.user.id),
          },
          update: { name: topic.name, showPublicly, updatedBy: Number(session.user.id) },
        });
        await logAudit(tx, {
          authorId: Number(session.user.id),
          action: 'update',
          entity: 'metric',
          entityId: metric.id,
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
