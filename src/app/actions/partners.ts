'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/require-user';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/audit-log';
import { Prisma } from '@/generated/prisma/client';

const PARTNER_NAME_SCHEMA = z.string().trim().min(1).max(100);
const PARTNER_ID_SCHEMA = z.number().int().positive();
const PARTNER_ORDER_SCHEMA = z
  .array(PARTNER_ID_SCHEMA)
  .refine((ids) => new Set(ids).size === ids.length);

function revalidatePartners() {
  revalidatePath('/management/metrics');
  revalidatePath('/');
}

export async function createPartner(input: unknown) {
  const user = await requireUser();
  if (user.role !== 'admin') {
    return { success: false as const, message: 'No tenés permisos para agregar contribuyentes.' };
  }
  const result = PARTNER_NAME_SCHEMA.safeParse(input);
  if (!result.success) {
    return { success: false as const, message: 'Ingresá un nombre de entre 1 y 100 caracteres.' };
  }
  try {
    const partner = await prisma.$transaction(
      async (tx) => {
        const { _max } = await tx.partner.aggregate({
          where: { deletedAt: null },
          _max: { sortOrder: true },
        });
        const created = await tx.partner.create({
          data: { name: result.data, sortOrder: (_max.sortOrder ?? 0) + 1 },
          select: { id: true, name: true },
        });
        await logAudit(tx, {
          authorId: user.id,
          action: 'creation',
          entity: 'partner',
          entityId: created.id,
          details: { name: created.name },
        });
        return created;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    revalidatePartners();
    return { success: true as const, partner, message: 'Contribuyente publicado.' };
  } catch (error) {
    const message =
      error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002'
        ? 'Ya existe un contribuyente con ese nombre.'
        : 'No se pudo agregar el contribuyente. Intentá de nuevo.';
    return { success: false as const, message };
  }
}

export async function deletePartner(input: unknown) {
  const user = await requireUser();
  if (user.role !== 'admin') {
    return { success: false, message: 'No tenés permisos para eliminar contribuyentes.' };
  }
  const result = PARTNER_ID_SCHEMA.safeParse(input);
  if (!result.success) {
    return { success: false, message: 'El contribuyente no es válido.' };
  }
  try {
    await prisma.$transaction(async (tx) => {
      const deleted = await tx.partner.update({
        where: { id: result.data, deletedAt: null },
        data: { deletedAt: new Date() },
      });
      await logAudit(tx, {
        authorId: user.id,
        action: 'deletion',
        entity: 'partner',
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
  revalidatePartners();
  return { success: true, message: 'Contribuyente eliminado.' };
}

export async function reorderPartners(input: unknown) {
  const user = await requireUser();
  if (user.role !== 'admin') {
    return { success: false, message: 'No tenés permisos para ordenar contribuyentes.' };
  }
  const result = PARTNER_ORDER_SCHEMA.safeParse(input);
  if (!result.success) {
    return { success: false, message: 'El orden de contribuyentes no es válido.' };
  }
  try {
    await prisma.$transaction(
      async (tx) => {
        const partners = await tx.partner.findMany({ where: { deletedAt: null } });
        const partnersById = new Map(partners.map((partner) => [partner.id, partner]));
        if (
          partners.length !== result.data.length ||
          result.data.some((id) => !partnersById.has(id))
        ) {
          throw new Error('Partner list changed');
        }
        const changes = result.data.flatMap((id, sortOrder) => {
          const partner = partnersById.get(id)!;
          return partner.sortOrder === sortOrder ? [] : [{ id, sortOrder }];
        });
        if (!changes.length) return;
        const previousOrder = [...partners].sort(
          (a, b) => a.sortOrder - b.sortOrder || a.id - b.id
        );
        await tx.$executeRaw(Prisma.sql`
          UPDATE "Partner" AS partner
          SET "sortOrder" = ordering."sortOrder"
          FROM (VALUES ${Prisma.join(changes.map(({ id, sortOrder }) => Prisma.sql`(${id}::integer, ${sortOrder}::integer)`))}) AS ordering("id", "sortOrder")
          WHERE partner."id" = ordering."id" AND partner."deletedAt" IS NULL
        `);
        await logAudit(tx, {
          authorId: user.id,
          action: 'update',
          entity: 'partner',
          details: {
            order: {
              from: previousOrder.map(({ name }) => name),
              to: result.data.map((id) => partnersById.get(id)!.name),
            },
          },
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
  revalidatePartners();
  return { success: true, message: 'Orden de contribuyentes actualizado.' };
}
