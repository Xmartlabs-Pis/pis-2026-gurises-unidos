import type { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { SYSTEM_BENEFICIARY_KEYS, type BeneficiaryCounts } from '@/lib/project-display';

export const BENEFICIARY_VALUES_SELECT = {
  values: { select: { value: true, category: { select: { key: true } } } },
} satisfies Prisma.ProjectBeneficiarySelect;

type BeneficiaryValueRow = { value: number; category: { key: string } };

export function toBeneficiaryCounts(values: BeneficiaryValueRow[]): BeneficiaryCounts {
  const counts: Record<string, number> = Object.fromEntries(
    SYSTEM_BENEFICIARY_KEYS.map((key) => [key, 0])
  );
  for (const { value, category } of values) {
    counts[category.key] = value;
  }
  return counts as BeneficiaryCounts;
}

export async function sumBeneficiaryValues(
  where: Prisma.ProjectBeneficiaryWhereInput,
  keys?: string[]
) {
  const { _sum } = await prisma.projectBeneficiaryValue.aggregate({
    where: { beneficiary: where, ...(keys && { category: { key: { in: keys } } }) },
    _sum: { value: true },
  });
  return _sum.value ?? 0;
}

export async function sumBeneficiaryCounts(where: Prisma.ProjectBeneficiaryWhereInput) {
  const [sums, categories] = await Promise.all([
    prisma.projectBeneficiaryValue.groupBy({
      by: ['categoryId'],
      where: { beneficiary: where },
      _sum: { value: true },
    }),
    prisma.beneficiaryCategory.findMany({ select: { id: true, key: true } }),
  ]);
  const keyById = new Map(categories.map(({ id, key }) => [id, key]));
  return toBeneficiaryCounts(
    sums.map(({ categoryId, _sum }) => ({
      value: _sum.value ?? 0,
      category: { key: keyById.get(categoryId) ?? '' },
    }))
  );
}
