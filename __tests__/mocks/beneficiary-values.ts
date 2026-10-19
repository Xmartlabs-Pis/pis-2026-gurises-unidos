import type { BeneficiaryCategoryOption } from '@/lib/project-display';
import { BENEFICIARY_CATEGORIES } from '../../prisma/fixtures';

export function beneficiaryValueRows(counts: Record<string, number>) {
  return Object.entries(counts).map(([key, value]) => ({ value, category: { key } }));
}

export const BENEFICIARY_CATEGORY_OPTIONS = BENEFICIARY_CATEGORIES.map(({ key, name }) => ({
  key,
  name,
})) as BeneficiaryCategoryOption[];

export const BENEFICIARY_CATEGORY_KEYS = BENEFICIARY_CATEGORY_OPTIONS.map(({ key }) => key);
