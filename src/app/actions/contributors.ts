'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/audit-log';
import { Prisma } from '@/generated/prisma/client';

const CONTRIBUTOR_NAME_SCHEMA = z.string().trim().min(1).max(100);
const CONTRIBUTOR_ID_SCHEMA = z.number().int().positive();
const CONTRIBUTOR_ORDER_SCHEMA = z
  .array(CONTRIBUTOR_ID_SCHEMA)
  .refine((ids) => new Set(ids).size === ids.length);

function revalidateContributors() {
  revalidatePath('/management/metrics');
  revalidatePath('/');
}

export async function createContributor(input: unknown) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return { success: false as const, message: 'No tenés permisos para agregar contribuyentes.' };
  }
  const result = CONTRIBUTOR_NAME_SCHEMA.safeParse(input);
  if (!result.success) {
    return { success: false as const, message: 'Ingresá un nombre de entre 1 y 100 caracteres.' };
  }
  try {
    const contributor = await prisma.$transaction(async (tx) => {
      const { _max } = await tx.contributor.aggregate({
        where: { deletedAt: null },
        _max: { sortOrder: true },
      });
      const created = await tx.contributor.create({
        data: { name: result.data, sortOrder: (_max.sortOrder ?? 0) + 1 },
        select: { id: true, name: true },
      });
      await logAudit(tx, {
        authorId: Number(session.user.id),
        action: 'creation',
        entity: 'contributor',
        entityId: created.id,
        details: { name: created.name },
      });
      return created;
    });
    revalidateContributors();
    return { success: true as const, contributor, message: 'Contribuyente publicado.' };
  } catch (error) {
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
        ? 'Ya existe un contribuyente con ese nombre.'
        : 'No se pudo agregar el contribuyente. Intentá de nuevo.';
    return { success: false as const, message };
  }
}

export async function deleteContributor(input: unknown) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return { success: false, message: 'No tenés permisos para eliminar contribuyentes.' };
  }
  const result = CONTRIBUTOR_ID_SCHEMA.safeParse(input);
  if (!result.success) {
    return { success: false, message: 'El contribuyente no es válido.' };
  }
  try {
    await prisma.$transaction(async (tx) => {
      const deleted = await tx.contributor.update({
        where: { id: result.data, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      await logAudit(tx, {
        authorId: Number(session.user.id),
        action: 'deletion',
        entity: 'contributor',
        entityId: deleted.id,
        details: { name: deleted.name },
      });
    });
  } catch {
    return {
      success: false,
      message: 'No se pudo eliminar el contribuyente. Recargá la página e intentá de nuevo.',
    };
  }
  revalidateContributors();
  return { success: true, message: 'Contribuyente eliminado.' };
}

export async function reorderContributors(input: unknown) {
  const session = await auth();
  if (session?.user?.role !== 'admin') {
    return { success: false, message: 'No tenés permisos para ordenar contribuyentes.' };
  }
  const result = CONTRIBUTOR_ORDER_SCHEMA.safeParse(input);
  if (!result.success) {
    return { success: false, message: 'El orden de contribuyentes no es válido.' };
  }
  try {
    await prisma.$transaction(
      async (tx) => {
        const contributors = await tx.contributor.findMany({ where: { deletedAt: null } });
        if (
          contributors.length !== result.data.length ||
          contributors.some(({ id }) => !result.data.includes(id))
        ) {
          throw new Error('Contributor list changed');
        }
        for (const [sortOrder, id] of result.data.entries()) {
          const contributor = contributors.find((item) => item.id === id)!;
          if (contributor.sortOrder === sortOrder) continue;
          await tx.contributor.update({ where: { id, deletedAt: null }, data: { sortOrder } });
          await logAudit(tx, {
            authorId: Number(session.user.id),
            action: 'update',
            entity: 'contributor',
            entityId: id,
            details: { sortOrder: { from: contributor.sortOrder, to: sortOrder } },
          });
        }
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch {
    return {
      success: false,
      message: 'No se pudo guardar el orden. Recargá la página e intentá de nuevo.',
    };
  }
  revalidateContributors();
  return { success: true, message: 'Orden de contribuyentes actualizado.' };
}
