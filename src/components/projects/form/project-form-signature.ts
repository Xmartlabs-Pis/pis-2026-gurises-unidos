import type { BeneficiaryCategoryOption, BeneficiaryCounts } from '@/lib/project-display';
import type { ProjectFormValues } from './project-form-values';

export function getProjectDetailsSignature(
  values: ProjectFormValues,
  categories: BeneficiaryCategoryOption[]
) {
  const excluded = new Set<string>([
    'year',
    'coverPhotoUrl',
    'beneficiaryDrafts',
    ...categories.map(({ key }) => key),
  ]);
  return JSON.stringify(
    Object.entries(values)
      .filter(([key]) => !excluded.has(key))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, value]) => [
        key,
        Array.isArray(value) && key !== 'locations'
          ? [...value].sort((a, b) => String(a).localeCompare(String(b)))
          : value,
      ])
  );
}

export function hasBeneficiaryDraftChanges(
  drafts: Record<string, Partial<Record<string, string>>>,
  records: (BeneficiaryCounts & { year: number })[],
  categories: BeneficiaryCategoryOption[]
) {
  return Object.entries(drafts).some(([year, counts]) => {
    const saved = records.find((record) => String(record.year) === year);
    return categories.some(({ key }) => Number(counts[key] ?? 0) !== Number(saved?.[key] ?? 0));
  });
}
