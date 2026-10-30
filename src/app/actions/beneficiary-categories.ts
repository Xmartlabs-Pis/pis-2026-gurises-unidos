'use server';

import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { Prisma } from '@/generated/prisma/client';
import { requireUser } from '@/lib/auth/require-user';
import { logAudit } from '@/lib/audit-log';
import { parseId } from '@/lib/validation/ids';
import { beneficiaryCategorySchema } from '@/lib/validation/beneficiary-category';
import prisma from '@/lib/prisma';

export type BeneficiaryCategoryActionState = {
  errors?: Record<string, string[]>;
  formError?: string;
  values?: {
    name: string;
  };
  success?: boolean;
};

const FORBIDDEN_MESSAGE = 'No tenés permisos para realizar esta acción.';
const DUPLICATE_NAME_MESSAGE = 'Ya existe una categoría con ese nombre.';

function revalidateBeneficiaryCategories() {
  revalidatePath('/', 'layout');
}

export async function createBeneficiaryCategory(
  _previousState: BeneficiaryCategoryActionState,
  formData: FormData
): Promise<BeneficiaryCategoryActionState> {
  const user = await requireUser();

  if (user.role !== 'admin') {
    return { formError: FORBIDDEN_MESSAGE };
  }

  const name = String(formData.get('name') ?? '');
  const parsed = beneficiaryCategorySchema.safeParse({ name });

  if (!parsed.success) {
    return {
      errors: z.flattenError(parsed.error).fieldErrors,
      values: { name },
    };
  }

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

    if (duplicate) {
      return { formError: DUPLICATE_NAME_MESSAGE, values: { name } };
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return {
        formError: DUPLICATE_NAME_MESSAGE,
        values: { name },
      };
    }

    return {
      formError: 'No se pudo crear la categoría. Intentá de nuevo.',
      values: { name },
    };
  }

  revalidateBeneficiaryCategories();

  return { success: true };
}

export async function deleteBeneficiaryCategory(
  categoryId: number
): Promise<BeneficiaryCategoryActionState> {
  const user = await requireUser();

  if (user.role !== 'admin') {
    return { formError: FORBIDDEN_MESSAGE };
  }

  if (!parseId(categoryId)) {
    return { formError: 'La categoría no es válida.' };
  }

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

    if (error) {
      return { formError: error };
    }
  } catch {
    return { formError: 'No se pudo eliminar la categoría. Intentá de nuevo.' };
  }

  revalidateBeneficiaryCategories();

  return { success: true };
}
