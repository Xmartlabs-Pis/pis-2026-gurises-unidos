'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { logAudit } from '@/lib/audit-log';
import { beneficiaryCategorySchema } from '@/lib/validation/beneficiary-category';
import prisma from '@/lib/prisma';
import {
  catalogWriteError,
  guardCatalogId,
  parseCatalogFields,
  readCatalogAdmin,
  renameCatalogRecord,
  type CatalogActionState,
} from '@/lib/catalog-actions';

export type BeneficiaryCategoryActionState = CatalogActionState<{ name: string }>;

const DUPLICATE_NAME_MESSAGE = 'Ya existe una categoría con ese nombre.';

function revalidateBeneficiaryCategories() {
  revalidatePath('/', 'layout');
}

function categoryName(formData: FormData) {
  return String(formData.get('name') ?? '');
}

export async function createBeneficiaryCategory(
  _previousState: BeneficiaryCategoryActionState,
  formData: FormData
): Promise<BeneficiaryCategoryActionState> {
  const access = await readCatalogAdmin();
  if (!access.user) return access.state;
  const user = access.user;

  const name = categoryName(formData);
  const parsed = parseCatalogFields(beneficiaryCategorySchema, { name });
  if (!parsed.ok) return parsed.state;

  try {
    const duplicate = await prisma.$transaction(async (tx) => {
      const existing = await tx.beneficiaryCategory.findFirst({
        where: { name: { equals: parsed.data.name, mode: 'insensitive' } },
        select: { id: true, isActive: true, isSystem: true },
      });
      if (existing && (existing.isActive || existing.isSystem)) return true;
      const { _max } = await tx.beneficiaryCategory.aggregate({ _max: { sortOrder: true } });
      const sortOrder = (_max.sortOrder ?? 0) + 1;
      const category = existing
        ? await tx.beneficiaryCategory.update({
            where: { id: existing.id },
            data: { isActive: true, sortOrder },
          })
        : await tx.beneficiaryCategory.create({
            data: {
              key: `custom${randomUUID().replaceAll('-', '')}`,
              name: parsed.data.name,
              sortOrder,
              createdBy: user.id,
            },
          });
      await logAudit(tx, {
        authorId: user.id,
        action: 'creation',
        entity: 'beneficiaryCategory',
        entityId: category.id,
        details: { name: category.name },
      });
      return false;
    });

    if (duplicate) return { formError: DUPLICATE_NAME_MESSAGE, values: { name } };
  } catch (error) {
    return catalogWriteError(
      error,
      { message: DUPLICATE_NAME_MESSAGE, values: { name } },
      { message: 'No se pudo crear la categoría. Intentá de nuevo.', values: { name } }
    );
  }

  revalidateBeneficiaryCategories();
  return { success: true };
}

export async function editBeneficiaryCategory(
  categoryId: number,
  _previousState: BeneficiaryCategoryActionState,
  formData: FormData
): Promise<BeneficiaryCategoryActionState> {
  const access = await readCatalogAdmin();
  if (!access.user) return access.state;
  const user = access.user;

  const invalid = guardCatalogId(categoryId, 'La categoría no es válida.');
  if (invalid) return invalid;

  const name = categoryName(formData);
  const parsed = parseCatalogFields(beneficiaryCategorySchema, { name });
  if (!parsed.ok) return parsed.state;

  try {
    const error = await prisma.$transaction((tx) =>
      renameCatalogRecord(tx, {
        id: categoryId,
        name: parsed.data.name,
        authorId: user.id,
        entity: 'beneficiaryCategory',
        missing: 'La categoría no existe o ya fue eliminada.',
        duplicate: DUPLICATE_NAME_MESSAGE,
        inactive: 'Ese nombre pertenece a una categoría dada de baja. Elegí otro nombre.',
        lock: () =>
          tx.$queryRaw`SELECT "id" FROM "BeneficiaryCategory" WHERE "id" = ${categoryId} FOR UPDATE`,
        findCurrent: () =>
          tx.beneficiaryCategory.findFirst({
            where: { id: categoryId, isActive: true },
            select: { name: true },
          }),
        findDuplicate: () =>
          tx.beneficiaryCategory.findFirst({
            where: {
              id: { not: categoryId },
              name: { equals: parsed.data.name, mode: 'insensitive' },
            },
            select: { id: true, isActive: true },
          }),
        update: () =>
          tx.beneficiaryCategory.update({
            where: { id: categoryId },
            data: { name: parsed.data.name },
          }),
      })
    );
    if (error) return { formError: error, values: { name } };
  } catch (error) {
    return catalogWriteError(
      error,
      { message: DUPLICATE_NAME_MESSAGE, values: { name } },
      { message: 'No se pudo editar la categoría. Intentá de nuevo.', values: { name } }
    );
  }

  revalidateBeneficiaryCategories();
  return { success: true };
}

export async function deleteBeneficiaryCategory(
  categoryId: number
): Promise<BeneficiaryCategoryActionState> {
  const access = await readCatalogAdmin();
  if (!access.user) return access.state;
  const user = access.user;

  const invalid = guardCatalogId(categoryId, 'La categoría no es válida.');
  if (invalid) return invalid;

  try {
    const error = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT "id" FROM "BeneficiaryCategory" WHERE "id" = ${categoryId} FOR UPDATE`;

      const category = await tx.beneficiaryCategory.findFirst({
        where: { id: categoryId, isActive: true },
        select: { name: true, isSystem: true },
      });
      if (!category) return 'La categoría no existe o ya fue eliminada.';
      if (category.isSystem) return 'Las categorías del sistema no se pueden eliminar.';

      const usage = await tx.projectBeneficiaryValue.count({
        where: { categoryId, value: { gt: 0 }, beneficiary: { project: { deletedAt: null } } },
      });
      if (usage > 0) return 'No se puede eliminar una categoría con valores cargados en proyectos.';

      await tx.beneficiaryCategory.update({
        where: { id: categoryId },
        data: { isActive: false },
      });
      await logAudit(tx, {
        authorId: user.id,
        action: 'deletion',
        entity: 'beneficiaryCategory',
        entityId: categoryId,
        details: { name: category.name },
      });
      return null;
    });

    if (error) return { formError: error };
  } catch {
    return { formError: 'No se pudo eliminar la categoría. Intentá de nuevo.' };
  }

  revalidateBeneficiaryCategories();
  return { success: true };
}
