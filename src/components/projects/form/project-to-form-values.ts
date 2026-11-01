import type { Project } from '@/generated/prisma/client';
import type { BeneficiaryCategoryOption, BeneficiaryCounts } from '@/lib/project-display';
import type { ProjectLocality } from '@/lib/projects/location';
import { getDefaultValues } from './get-default-values';
import type { ProjectLocationFormValue, ProjectFormValues } from './project-form-values';

function toLocationFormValues(
  departments: { id: number }[],
  localities: ProjectLocality[]
): ProjectLocationFormValue[] {
  return departments.flatMap(({ id }) => {
    const departmentId = String(id);
    const departmentLocalities = localities.filter((locality) => locality.departmentId === id);
    if (departmentLocalities.length === 0) return [{ departmentId, city: '', neighborhood: '' }];
    return departmentLocalities.map(({ city, neighborhood }) => ({
      departmentId,
      city,
      neighborhood: neighborhood ?? '',
    }));
  });
}

export function projectToFormValues(
  project: Project & {
    projectBeneficiaries: (BeneficiaryCounts & { year: number })[];
    topics: { id: number }[];
    strategicLines?: { id: number }[];
    departments?: { id: number }[];
    localities?: ProjectLocality[];
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
    countries: project.countries,
    locations: toLocationFormValues(project.departments ?? [], project.localities ?? []),
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
