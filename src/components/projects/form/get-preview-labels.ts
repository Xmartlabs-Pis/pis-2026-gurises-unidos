import { PREVIEW_LOCATION_FALLBACK, type BeneficiaryCategoryOption } from '@/lib/project-display';
import { getLocationLabel, getTerritoryLabel, type ProjectLocation } from '@/lib/projects/location';
import type { ProjectFormValues } from './project-form-values';

export function getPreviewLabels(
  values: ProjectFormValues,
  departments: { id: number; name: string }[],
  isEditing: boolean,
  categories: BeneficiaryCategoryOption[]
) {
  const isNational = values.geographicScope !== 'international';
  const locations = isNational ? values.locations : [];
  const location: ProjectLocation = {
    geographicScope: isNational ? 'national' : 'international',
    departments: departments.filter(({ id }) =>
      locations.some(({ departmentId }) => departmentId === String(id))
    ),
    countries: isNational ? [] : values.countries,
    localities: locations
      .filter(({ city }) => city)
      .map(({ departmentId, city, neighborhood }) => ({
        departmentId: Number(departmentId),
        city,
        neighborhood: neighborhood || null,
      })),
  };
  const firstLocality = location.localities[0];
  const locationLabel =
    (isEditing && (firstLocality?.neighborhood || firstLocality?.city)) ||
    getTerritoryLabel(location) ||
    PREVIEW_LOCATION_FALLBACK;
  const coverageLabel = getLocationLabel(location);
  const beneficiaryTotal = categories.reduce(
    (total, { key }) => total + Math.max(0, Number(values[key]) || 0),
    0
  );

  return { locationLabel, coverageLabel, beneficiaryTotal };
}
