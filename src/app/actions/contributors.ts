'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/require-user';
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
  const user = await requireUser();
  if (user.role !== 'admin') {
    return { success: false as const, message: 'No tenés permisos para agregar contribuyentes.' };
  }
  const result = CONTRIBUTOR_NAME_SCHEMA.safeParse(input);
  if (!result.success) {
    return { success: false as const, message: 'Ingresá un nombre de entre 1 y 100 caracteres.' };
  }
  try {
    const contributor = await prisma.$transaction(
      async (tx) => {
        const { _max } = await tx.contributor.aggregate({
          where: { deletedAt: null },
          _max: { sortOrder: true },
        });
        const created = await tx.contributor.create({
          data: { name: result.data, sortOrder: (_max.sortOrder ?? 0) + 1 },
          select: { id: true, name: true },
        });
        await logAudit(tx, {
          authorId: user.id,
          action: 'creation',
          entity: 'contributor',
          entityId: created.id,
          details: { name: created.name },
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
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
  const user = await requireUser();
  if (user.role !== 'admin') {
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
        authorId: user.id,
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
  const user = await requireUser();
  if (user.role !== 'admin') {
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
        const contributorsById = new Map(
          contributors.map((contributor) => [contributor.id, contributor])
        );
        if (
          contributors.length !== result.data.length ||
          result.data.some((id) => !contributorsById.has(id))
        ) {
          throw new Error('Contributor list changed');
        }
        const changes = result.data.flatMap((id, sortOrder) => {
          const contributor = contributorsById.get(id)!;
          return contributor.sortOrder === sortOrder
            ? []
            : [{ id, sortOrder, previousOrder: contributor.sortOrder }];
        });
        if (!changes.length) return;
        await tx.$executeRaw(Prisma.sql`
          UPDATE "Contributor" AS contributor
          SET "sortOrder" = ordering."sortOrder"
          FROM (VALUES ${Prisma.join(changes.map(({ id, sortOrder }) => Prisma.sql`(${id}::integer, ${sortOrder}::integer)`))}) AS ordering("id", "sortOrder")
          WHERE contributor."id" = ordering."id" AND contributor."deletedAt" IS NULL
        `);
        await tx.auditLog.createMany({
          data: changes.map(({ id, sortOrder, previousOrder }) => ({
            authorId: user.id,
            action: 'update',
            entity: 'contributor',
            entityId: id,
            details: { sortOrder: { from: previousOrder, to: sortOrder } },
          })),
        });
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
