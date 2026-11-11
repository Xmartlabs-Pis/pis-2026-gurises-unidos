'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { requireUser } from '@/lib/auth/require-user';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/audit-log';
import { Prisma } from '@/generated/prisma/client';
import { parseId } from '@/lib/validation/ids';
import { partnerSchema } from '@/lib/validation/partner';

export type PartnerActionState = {
  errors?: Record<string, string[]>;
  formError?: string;
  values?: {
    name: string;
    counterpartyType: string;
  };
  success?: boolean;
};

const PARTNER_ID_SCHEMA = z.number().int().positive();
const PARTNER_ORDER_SCHEMA = z
  .array(PARTNER_ID_SCHEMA)
  .refine((ids) => new Set(ids).size === ids.length);
const PARTNER_PLACEMENT_SCHEMA = z.object({
  id: PARTNER_ID_SCHEMA,
  showPublicly: z.boolean(),
  order: PARTNER_ORDER_SCHEMA,
});

function revalidatePartners() {
  revalidatePath('/management/metrics');
  revalidatePath('/management/partners');
  revalidatePath('/dashboard/projects', 'layout');
  revalidatePath('/');
}

export async function createPartner(
  _previousState: PartnerActionState,
  formData: FormData
): Promise<PartnerActionState> {
  const user = await requireUser();
  if (user.role !== 'admin') {
    return { formError: 'No tenés permisos para realizar esta acción.' };
  }

  const values = {
    name: String(formData.get('name') ?? ''),
    counterpartyType: String(formData.get('counterpartyType') ?? ''),
  };
  const parsed = partnerSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const { name, counterpartyType } = parsed.data;

  try {
    const error = await prisma.$transaction(
      async (tx) => {
        const existing = await tx.partner.findFirst({
          where: { name: { equals: name, mode: 'insensitive' } },
          select: { id: true, name: true, isActive: true },
        });
        if (existing?.isActive) return 'Ya existe un socio con ese nombre.';

        const { _max } = await tx.partner.aggregate({
          where: { isActive: true },
          _max: { sortOrder: true },
        });
        const sortOrder = (_max.sortOrder ?? 0) + 1;

        const partner = existing
          ? await tx.partner.update({
              where: { id: existing.id },
              data: { isActive: true, showPublicly: false, counterpartyType, sortOrder },
            })
          : await tx.partner.create({ data: { name, counterpartyType, sortOrder } });

        await logAudit(tx, {
          authorId: user.id,
          action: 'creation',
          entity: 'partner',
          entityId: partner.id,
          details: { name: partner.name, counterpartyType },
        });
        return null;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
    if (error) return { formError: error, values };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { formError: 'Ya existe un socio con ese nombre.', values };
    }
    return { formError: 'No se pudo crear el socio. Intentá de nuevo.', values };
  }

  revalidatePartners();
  return { success: true };
}

export async function deletePartner(id: number): Promise<PartnerActionState> {
  const user = await requireUser();
  if (user.role !== 'admin') {
    return { formError: 'No tenés permisos para realizar esta acción.' };
  }
  if (!parseId(id)) {
    return { formError: 'El socio no es válido.' };
  }
  try {
    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Partner" WHERE "id" = ${id} FOR UPDATE`;
      const projectCount = await tx.project.count({
        where: { deletedAt: null, partners: { some: { id } } },
      });
      if (projectCount > 0) return 'associated';
      const deleted = await tx.partner.update({
        where: { id, isActive: true },
        data: { isActive: false },
      });
      await logAudit(tx, {
        authorId: user.id,
        action: 'deletion',
        entity: 'partner',
        entityId: deleted.id,
        details: { name: deleted.name },
      });
      return 'deleted';
    });
    if (result === 'associated') {
      return { formError: 'No se puede eliminar un socio asociado a proyectos.' };
    }
  } catch {
    return { formError: 'No se pudo eliminar el socio. Intentá de nuevo.' };
  }
  revalidatePartners();
  return { success: true };
}

async function savePartnerOrder(tx: Prisma.TransactionClient, order: number[]) {
  const partners = await tx.partner.findMany({
    where: { isActive: true },
    select: { id: true, sortOrder: true },
  });
  const partnersById = new Map(partners.map((partner) => [partner.id, partner]));
  if (partners.length !== order.length || order.some((id) => !partnersById.has(id))) {
    throw new Error('Partner list changed');
  }
  const changes = order.flatMap((id, sortOrder) => {
    const partner = partnersById.get(id)!;
    return partner.sortOrder === sortOrder ? [] : [{ id, sortOrder }];
  });
  if (!changes.length) return;
  await tx.$executeRaw(Prisma.sql`
    UPDATE "Partner" AS partner
    SET "sortOrder" = ordering."sortOrder"
    FROM (VALUES ${Prisma.join(changes.map(({ id, sortOrder }) => Prisma.sql`(${id}::integer, ${sortOrder}::integer)`))}) AS ordering("id", "sortOrder")
    WHERE partner."id" = ordering."id" AND partner."isActive"
  `);
}

export async function reorderPartners(input: unknown) {
  const user = await requireUser();
  if (user.role !== 'admin') {
    return { success: false, message: 'No tenés permisos para ordenar socios.' };
  }
  const result = PARTNER_ORDER_SCHEMA.safeParse(input);
  if (!result.success) {
    return { success: false, message: 'El orden de socios no es válido.' };
  }
  try {
    await prisma.$transaction((tx) => savePartnerOrder(tx, result.data), {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
    });
  } catch {
    return {
      success: false,
      message: 'No se pudo guardar el orden. Recargá la página e intentá de nuevo.',
    };
  }
  revalidatePartners();
  return { success: true, message: 'Orden de socios actualizado.' };
}

export async function placePartner(input: unknown) {
  const user = await requireUser();
  if (user.role !== 'admin') {
    return { success: false, message: 'No tenés permisos para ordenar socios.' };
  }
  const result = PARTNER_PLACEMENT_SCHEMA.safeParse(input);
  if (!result.success) {
    return { success: false, message: 'El orden de socios no es válido.' };
  }
  const { id, showPublicly, order } = result.data;
  try {
    await prisma.$transaction(
      async (tx) => {
        const partner = await tx.partner.update({
          where: { id, isActive: true },
          data: { showPublicly },
        });
        await logAudit(tx, {
          authorId: user.id,
          action: 'update',
          entity: 'partner',
          entityId: id,
          details: { name: partner.name, showPublicly },
        });
        await savePartnerOrder(tx, order);
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );
  } catch {
    return {
      success: false,
      message: 'No se pudo mover el socio. Recargá la página e intentá de nuevo.',
    };
  }
  revalidatePartners();
  return { success: true, message: 'Socio actualizado.' };
}

export async function editPartner(
  id: number,
  _previousState: PartnerActionState,
  formData: FormData
): Promise<PartnerActionState> {
  const user = await requireUser();
  if (user.role !== 'admin') {
    return { formError: 'No tenés permisos para realizar esta acción.' };
  }
  if (!parseId(id)) {
    return { formError: 'El socio no es válido.' };
  }

  const values = {
    name: String(formData.get('name') ?? ''),
    counterpartyType: String(formData.get('counterpartyType') ?? ''),
  };
  const parsed = partnerSchema.safeParse(values);
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors, values };
  }
  const { name, counterpartyType } = parsed.data;

  try {
    const error = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "Partner" WHERE "id" = ${id} FOR UPDATE`;

      const partner = await tx.partner.findFirst({
        where: { id, isActive: true },
        select: { name: true, counterpartyType: true },
      });
      if (!partner) return 'El socio no existe o ya fue eliminado.';

      const duplicate = await tx.partner.findFirst({
        where: {
          id: { not: id },
          name: { equals: name, mode: 'insensitive' },
        },
        select: { isActive: true },
      });
      if (duplicate) {
        return duplicate.isActive
          ? 'Ya existe un socio con ese nombre.'
          : 'Ya existe un socio dado de baja con ese nombre. Para recuperarlo, crealo de nuevo desde "Agregar".';
      }

      if (counterpartyType !== partner.counterpartyType) {
        const projectCount = await tx.project.count({
          where: { deletedAt: null, partners: { some: { id } } },
        });
        if (projectCount > 0) {
          return 'No se puede cambiar el tipo de un socio asociado a proyectos.';
        }
      }

      await tx.partner.update({ where: { id }, data: { name, counterpartyType } });
      await logAudit(tx, {
        authorId: user.id,
        action: 'update',
        entity: 'partner',
        entityId: id,
        details: {
          previousName: partner.name,
          name,
          previousCounterpartyType: partner.counterpartyType,
          counterpartyType,
        },
      });
      return null;
    });
    if (error) return { formError: error, values };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { formError: 'Ya existe un socio con ese nombre.', values };
    }
    return { formError: 'No se pudo editar el socio. Intentá de nuevo.', values };
  }

  revalidatePartners();
  return { success: true };
}

export async function setPartnerVisibility(id: number, showPublicly: boolean) {
  const user = await requireUser();
  if (user.role !== 'admin') {
    return { success: false, message: 'No tenés permisos para realizar esta acción.' };
  }
  if (!parseId(id) || typeof showPublicly !== 'boolean') {
    return { success: false, message: 'El socio no es válido.' };
  }
  try {
    await prisma.$transaction(async (tx) => {
      const partner = await tx.partner.update({
        where: { id, isActive: true },
        data: { showPublicly },
      });
      await logAudit(tx, {
        authorId: user.id,
        action: 'update',
        entity: 'partner',
        entityId: id,
        details: { name: partner.name, showPublicly },
      });
    });
  } catch {
    return {
      success: false,
      message: 'No se pudo actualizar la visibilidad. Recargá la página e intentá de nuevo.',
    };
  }
  revalidatePartners();
  return { success: true, message: 'Visibilidad actualizada.' };
}
