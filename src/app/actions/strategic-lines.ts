'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { requireUser } from '@/lib/auth/require-user';
import { logAudit } from '@/lib/audit-log';
import { parseId } from '@/lib/validation/ids';
import { strategicLineSchema } from '@/lib/validation/strategic-line';
import prisma from '@/lib/prisma';

export type StrategicLineActionState = {
  errors?: Record<string, string[]>;
  formError?: string;
  values?: {
    name: string;
  };
  success?: boolean;
};

function revalidateStrategicLines() {
  revalidatePath('/management/strategic-lines');
  revalidatePath('/dashboard/projects', 'layout');
}

export async function createStrategicLine(
  _previousState: StrategicLineActionState,
  formData: FormData
): Promise<StrategicLineActionState> {
  const user = await requireUser();
  if (user.role !== 'admin') {
    return {
      formError: 'No tenés permisos para realizar esta acción.',
    };
  }

  const name = String(formData.get('name') ?? '');
  const parsed = strategicLineSchema.safeParse({ name });

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      values: { name },
    };
  }

  try {
    const reactivated = await prisma.strategicLine.updateMany({
      where: {
        name: { equals: parsed.data.name, mode: 'insensitive' },
        isActive: false,
      },
      data: { isActive: true },
    });

    if (reactivated.count > 0) {
      revalidateStrategicLines();
      return { success: true };
    }

    const existing = await prisma.strategicLine.findFirst({
      where: { name: { equals: parsed.data.name, mode: 'insensitive' } },
    });

    if (existing) {
      return {
        formError: 'Ya existe una línea estratégica con ese nombre.',
        values: { name },
      };
    }

    await prisma.strategicLine.create({
      data: {
        name: parsed.data.name,
        isActive: true,
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return {
        formError: 'Ya existe una línea estratégica con ese nombre.',
        values: { name },
      };
    }
    return {
      formError: 'No se pudo crear la línea estratégica. Intentá de nuevo.',
      values: { name },
    };
  }

  revalidateStrategicLines();
  return { success: true };
}

export async function editStrategicLine(
  id: number,
  _previousState: StrategicLineActionState,
  formData: FormData
): Promise<StrategicLineActionState> {
  const user = await requireUser();
  if (user.role !== 'admin') {
    return { formError: 'No tenés permisos para realizar esta acción.' };
  }

  if (!parseId(id)) {
    return { formError: 'La línea estratégica no es válida.' };
  }

  const name = String(formData.get('name') ?? '');
  const parsed = strategicLineSchema.safeParse({ name });

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      values: { name },
    };
  }

  try {
    const error = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "StrategicLine" WHERE "id" = ${id} FOR UPDATE`;

      const line = await tx.strategicLine.findFirst({
        where: { id, isActive: true },
        select: { name: true },
      });
      if (!line) return 'La línea estratégica no existe o ya fue eliminada.';

      const duplicate = await tx.strategicLine.findFirst({
        where: {
          id: { not: id },
          name: { equals: parsed.data.name, mode: 'insensitive' },
        },
        select: { id: true },
      });
      if (duplicate) return 'Ya existe una línea estratégica con ese nombre.';

      await tx.strategicLine.update({
        where: { id },
        data: { name: parsed.data.name },
      });
      await logAudit(tx, {
        authorId: user.id,
        action: 'update',
        entity: 'strategicLine',
        entityId: id,
        details: { previousName: line.name, name: parsed.data.name },
      });
      return null;
    });

    if (error) {
      return { formError: error, values: { name } };
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return {
        formError: 'Ya existe una línea estratégica con ese nombre.',
        values: { name },
      };
    }

    return {
      formError: 'No se pudo editar la línea estratégica. Intentá de nuevo.',
      values: { name },
    };
  }

  revalidateStrategicLines();
  return { success: true };
}

export async function deleteStrategicLine(id: number): Promise<StrategicLineActionState> {
  const user = await requireUser();
  if (user.role !== 'admin') {
    return {
      formError: 'No tenés permisos para realizar esta acción.',
    };
  }

  if (!parseId(id)) {
    return {
      formError: 'La línea estratégica no es válida.',
    };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "StrategicLine" WHERE "id" = ${id} FOR UPDATE`;
      const projectCount = await tx.project.count({
        where: { deletedAt: null, strategicLines: { some: { id } } },
      });
      if (projectCount > 0) return 'associated';
      await tx.strategicLine.update({ where: { id }, data: { isActive: false } });
      return 'deleted';
    });
    if (result === 'associated') {
      return {
        formError: 'No se puede eliminar una línea estratégica asociada a proyectos.',
      };
    }
  } catch {
    return {
      formError: 'No se pudo eliminar la línea estratégica. Intentá de nuevo.',
    };
  }

  revalidateStrategicLines();
  return { success: true };
}
