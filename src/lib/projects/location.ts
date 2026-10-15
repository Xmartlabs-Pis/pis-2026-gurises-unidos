import type { Prisma } from '@/generated/prisma/client';
import type { GeographicScope } from '@/generated/prisma/enums';

export type ProjectLocation = {
  geographicScope: GeographicScope;
  departments: { name: string }[];
  countries: string[];
  cities: string[];
  neighborhoods: string[];
};

export const PROJECT_LOCATION_SELECT = {
  geographicScope: true,
  countries: true,
  cities: true,
  neighborhoods: true,
  departments: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
} satisfies Prisma.ProjectSelect;

export function getTerritoryLabel({
  geographicScope,
  departments,
  countries,
}: Pick<ProjectLocation, 'geographicScope' | 'departments' | 'countries'>) {
  const territories =
    geographicScope === 'international' ? countries : departments.map(({ name }) => name);
  return territories.join(', ');
}

export function getLocationLabel(location: ProjectLocation) {
  return [
    getTerritoryLabel(location),
    location.cities.join(', '),
    location.neighborhoods.join(', '),
  ]
    .filter(Boolean)
    .join(' — ');
}
