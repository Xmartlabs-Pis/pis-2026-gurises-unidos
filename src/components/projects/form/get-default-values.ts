import type { BeneficiaryCategoryOption } from '@/lib/project-display';
import type { ProjectFormValues } from './project-form-values';

export function getDefaultValues(
  currentYear: number,
  categories: BeneficiaryCategoryOption[]
): ProjectFormValues {
  return {
    year: String(currentYear),
    name: '',
    status: 'active',
    topicId: '',
    intensity: 'high',
    counterpartyType: '',
    startYear: String(currentYear),
    endYear: '',
    leadCoordinatorId: '',
    departmentId: '',
    zone: 'city',
    localityNeighborhood: '',
    generalObjective: '',
    publicDescription: '',
    internalNotes: '',
    coverPhotoUrl: null,
    ...Object.fromEntries(categories.map(({ key }) => [key, '0'])),
  };
}
