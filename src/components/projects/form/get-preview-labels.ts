import {
  ZONE_OPTIONS,
  PREVIEW_LOCATION_FALLBACK,
  type BeneficiaryCategoryOption,
} from '@/lib/project-display';
import { getLocationLabel, getTerritoryLabel, type ProjectLocation } from '@/lib/projects/location';
import type { ProjectFormValues } from './project-form-values';

export function getPreviewLabels(
  values: ProjectFormValues,
  departments: { id: number; name: string }[],
  isEditing: boolean,
  categories: BeneficiaryCategoryOption[]
) {
  const isNational = values.geographicScope !== 'international';
  const location: ProjectLocation = {
    geographicScope: isNational ? 'national' : 'international',
    departments: isNational
      ? departments.filter(({ id }) => values.departmentIds.includes(String(id)))
      : [],
    countries: isNational ? [] : values.countries,
    cities: isNational ? values.cities : [],
    neighborhoods: isNational ? values.neighborhoods : [],
  };
  const zoneLabel = ZONE_OPTIONS.find((option) => option.value === values.zone)?.label;
  const locationLabel =
    (isEditing && (location.neighborhoods[0] ?? location.cities[0])) ||
    getTerritoryLabel(location) ||
    zoneLabel ||
    PREVIEW_LOCATION_FALLBACK;
  const coverageLabel = getLocationLabel(location);
  const beneficiaryTotal = categories.reduce(
    (total, { key }) => total + Math.max(0, Number(values[key]) || 0),
    0
  );

  return { locationLabel, coverageLabel, beneficiaryTotal };
}
