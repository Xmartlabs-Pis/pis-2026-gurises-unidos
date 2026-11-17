import type { Prisma } from '@/generated/prisma/client';
import type { GeographicScope, Region } from '@/generated/prisma/enums';
import { REGION_LABEL } from '@/lib/project-display';

export type ProjectLocality = {
  departmentId: number;
  city: string;
  neighborhood: string | null;
};

export type ProjectLocation = {
  geographicScope: GeographicScope;
  departments: { id: number; name: string }[];
  countries: string[];
  region: Region | null;
  localities: ProjectLocality[];
};

export const PROJECT_TERRITORY_SELECT = {
  geographicScope: true,
  countries: true,
  region: true,
  departments: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
} satisfies Prisma.ProjectSelect;

export const PROJECT_LOCATION_SELECT = {
  ...PROJECT_TERRITORY_SELECT,
  localities: {
    select: { departmentId: true, city: true, neighborhood: true },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.ProjectSelect;

type TerritoryInput = Pick<ProjectLocation, 'geographicScope' | 'countries' | 'region'> & {
  departments: { name: string }[];
};

export function getTerritoryNames({
  geographicScope,
  departments,
  countries,
  region,
}: TerritoryInput) {
  if (geographicScope === 'national') return departments.map(({ name }) => name);
  if (countries.length > 0 || !region) return countries;
  return [REGION_LABEL[region]];
}

export function getTerritoryLabel(location: TerritoryInput) {
  return getTerritoryNames(location).join(', ');
}

export function getLocationLines({
  geographicScope,
  departments,
  countries,
  localities,
}: ProjectLocation) {
  if (geographicScope === 'international') return countries;
  return departments.flatMap(({ id, name }) => {
    const departmentLocalities = localities.filter(({ departmentId }) => departmentId === id);
    if (departmentLocalities.length === 0) return [name];
    return departmentLocalities.map(({ city, neighborhood }) =>
      [name, city, neighborhood].filter(Boolean).join(', ')
    );
  });
}

export function getLocationLabel(location: ProjectLocation) {
  return getLocationLines(location).join(
    location.geographicScope === 'international' ? ', ' : '; '
  );
}
