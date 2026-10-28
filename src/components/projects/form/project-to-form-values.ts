import type { Project } from '@/generated/prisma/client';
import type { BeneficiaryCategoryOption, BeneficiaryCounts } from '@/lib/project-display';
import { getDefaultValues } from './get-default-values';
import type { ProjectFormValues } from './project-form-values';

export function projectToFormValues(
  project: Project & {
    projectBeneficiaries: (BeneficiaryCounts & { year: number })[];
    topics: { id: number }[];
    strategicLines?: { id: number }[];
    departments?: { id: number }[];
  },
  currentYear: number,
  categories: BeneficiaryCategoryOption[]
): ProjectFormValues {
  const beneficiary = project.projectBeneficiaries.find(({ year }) => year === currentYear);
  const defaults = getDefaultValues(currentYear, categories);
  return {
    ...defaults,
    name: project.name,
    status: project.status,
    intensity: project.intensity ?? '',
    counterpartyType: project.counterpartyType,
    startYear: String(project.startYear),
    endYear: project.endYear === null ? '' : String(project.endYear),
    leadCoordinatorId: String(project.leadCoordinatorId),
    geographicScope: project.geographicScope,
    departmentIds: project.departments?.map(({ id }) => String(id)) ?? [],
    countries: project.countries,
    cities: project.cities,
    neighborhoods: project.neighborhoods,
    generalObjective: project.generalObjective ?? '',
    publicDescription: project.publicDescription ?? '',
    internalNotes: project.internalNotes ?? '',
    showOnLanding: String(project.showOnLanding),
    coverPhotoUrl: project.coverPhoto,
    topicIds: project.topics.map(({ id }) => String(id)),
    strategicLineIds: project.strategicLines?.map(({ id }) => String(id)) ?? [],
    ...Object.fromEntries(categories.map(({ key }) => [key, String(beneficiary?.[key] ?? 0)])),
  };
}
