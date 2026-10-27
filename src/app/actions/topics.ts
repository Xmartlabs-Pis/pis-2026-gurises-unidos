'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { requireUser } from '@/lib/auth/require-user';
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
    const reactivated = await prisma.topic.updateMany({
      where: { name: parsed.data.name, isActive: false },
      data: { isActive: true },
    });

    if (reactivated.count > 0) {
      revalidateTopics();
      return { success: true };
    }

    await prisma.topic.create({
      data: {
        name: parsed.data.name,
        isActive: true,
      },
    });
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

      await tx.topic.update({
        where: { id: topicId },
        data: { isActive: false },
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
    await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Topic" WHERE "id" = ${topicId} FOR UPDATE`;

      await tx.topic.update({
        where: { id: topicId },
        data: { name: parsed.data.name },
      });
    });
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
