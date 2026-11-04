import {
  PREVIEW_LOCATION_FALLBACK,
  REGION_LABEL,
  type BeneficiaryCategoryOption,
} from '@/lib/project-display';
import type { Region } from '@/generated/prisma/enums';
import { getLocationLabel, getTerritoryLabel, type ProjectLocation } from '@/lib/projects/location';
import type { ProjectFormValues } from './project-form-values';

function isRegion(value: string): value is Region {
  return Object.hasOwn(REGION_LABEL, value);
}

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
    region: isNational || !isRegion(values.region) ? null : values.region,
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
  const coverageLabel = getLocationLabel(location) || getTerritoryLabel(location);
  const beneficiaryTotal = categories.reduce(
    (total, { key }) => total + Math.max(0, Number(values[key]) || 0),
    0
  );

  return { locationLabel, coverageLabel, beneficiaryTotal };
}
