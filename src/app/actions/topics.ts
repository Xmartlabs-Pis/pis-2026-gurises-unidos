'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { requireUser } from '@/lib/auth/require-user';
import { logAudit } from '@/lib/audit-log';
import { parseId } from '@/lib/validation/ids';
import { topicSchema } from '@/lib/validation/topic';
import prisma from '@/lib/prisma';

export type TopicActionState = {
  errors?: Record<string, string[]>;
  formError?: string;
  values?: {
    name: string;
  };
  success?: boolean;
};

function revalidateTopics() {
  revalidatePath('/management/topics');
  revalidatePath('/dashboard/projects', 'layout');
}

export async function createTopic(
  _previousState: TopicActionState,
  formData: FormData
): Promise<TopicActionState> {
  const user = await requireUser();

  if (user.role !== 'admin') {
    return {
      formError: 'No tenés permisos para realizar esta acción.',
    };
  }

  const name = String(formData.get('name') ?? '');
  const parsed = topicSchema.safeParse({ name });

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      values: { name },
    };
  }

  try {
    const duplicate = await prisma.$transaction(async (tx) => {
      const existing = await tx.topic.findFirst({
        where: { name: { equals: parsed.data.name, mode: 'insensitive' } },
      });
      if (existing?.isActive) return true;
      const topic = existing
        ? await tx.topic.update({ where: { id: existing.id }, data: { isActive: true } })
        : await tx.topic.create({ data: { name: parsed.data.name, isActive: true } });
      await logAudit(tx, {
        authorId: user.id,
        action: 'creation',
        entity: 'topic',
        entityId: topic.id,
        details: { name: topic.name },
      });
      return false;
    });

    if (duplicate) {
      return {
        formError: 'Ya existe una temática con ese nombre.',
        values: { name },
      };
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return {
        formError: 'Ya existe una temática con ese nombre.',
        values: { name },
      };
    }

    return {
      formError: 'No se pudo crear la temática. Intentá de nuevo.',
      values: { name },
    };
  }

  revalidateTopics();

  return { success: true };
}

export async function deleteTopic(topicId: number): Promise<TopicActionState> {
  const user = await requireUser();

  if (user.role !== 'admin') {
    return {
      formError: 'No tenés permisos para realizar esta acción.',
    };
  }

  if (!parseId(topicId)) {
    return {
      formError: 'La temática no es válida.',
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Topic" WHERE "id" = ${topicId} FOR UPDATE`;

      const projectCount = await tx.project.count({
        where: { topics: { some: { id: topicId } }, deletedAt: null },
      });
      if (projectCount > 0) return false;

      const topic = await tx.topic.update({
        where: { id: topicId },
        data: { isActive: false },
      });
      await logAudit(tx, {
        authorId: user.id,
        action: 'deletion',
        entity: 'topic',
        entityId: topicId,
        details: { name: topic.name },
      });
      return true;
    });

    if (!result) {
      return {
        formError: 'No se puede eliminar una temática asociada a proyectos.',
      };
    }
  } catch {
    return {
      formError: 'No se pudo eliminar la temática. Intentá de nuevo.',
    };
  }

  revalidateTopics();

  return { success: true };
}

export async function editTopic(
  topicId: number,
  _previousState: TopicActionState,
  formData: FormData
): Promise<TopicActionState> {
  const user = await requireUser();

  if (user.role !== 'admin') {
    return {
      formError: 'No tenés permisos para realizar esta acción.',
    };
  }

  if (!parseId(topicId)) {
    return {
      formError: 'La temática no es válida.',
    };
  }
  const name = String(formData.get('name') ?? '');
  const parsed = topicSchema.safeParse({ name });

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      values: { name },
    };
  }

  try {
    const error = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Topic" WHERE "id" = ${topicId} FOR UPDATE`;

      const topic = await tx.topic.findFirst({
        where: { id: topicId, isActive: true },
        select: { name: true },
      });
      if (!topic) return 'La temática no existe o ya fue eliminada.';

      const duplicate = await tx.topic.findFirst({
        where: {
          id: { not: topicId },
          name: { equals: parsed.data.name, mode: 'insensitive' },
        },
        select: { id: true, isActive: true },
      });
      if (duplicate) {
        return duplicate.isActive
          ? 'Ya existe una temática con ese nombre.'
          : 'Ese nombre pertenece a una temática dada de baja. Elegí otro nombre.';
      }

      await tx.topic.update({
        where: { id: topicId },
        data: { name: parsed.data.name },
      });
      await logAudit(tx, {
        authorId: user.id,
        action: 'update',
        entity: 'topic',
        entityId: topicId,
        details: { previousName: topic.name, name: parsed.data.name },
      });
      return null;
    });

    if (error) {
      return { formError: error, values: { name } };
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return {
        formError: 'Ya existe una temática con ese nombre.',
        values: { name: parsed.data.name },
      };
    }
    return {
      formError: 'No se pudo editar la temática. Intentá de nuevo.',
    };
  }

  revalidateTopics();

  return { success: true };
}
