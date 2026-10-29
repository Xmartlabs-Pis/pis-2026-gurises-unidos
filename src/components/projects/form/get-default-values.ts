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
    topicIds: [],
    intensity: '',
    counterpartyType: '',
    startYear: String(currentYear),
    endYear: '',
    leadCoordinatorId: '',
    strategicLineIds: [],
    geographicScope: 'national',
    countries: [],
    locations: [],
    generalObjective: '',
    publicDescription: '',
    internalNotes: '',
    showOnLanding: 'true',
    coverPhotoUrl: null,
    ...Object.fromEntries(categories.map(({ key }) => [key, '0'])),
  };
}
