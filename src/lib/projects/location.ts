import type { Prisma } from '@/generated/prisma/client';
import type { GeographicScope } from '@/generated/prisma/enums';

export type ProjectLocality = {
  departmentId: number;
  city: string;
  neighborhood: string | null;
};

export type ProjectLocation = {
  geographicScope: GeographicScope;
  departments: { id: number; name: string }[];
  countries: string[];
  localities: ProjectLocality[];
};

export const PROJECT_TERRITORY_SELECT = {
  geographicScope: true,
  countries: true,
  departments: { select: { id: true, name: true }, orderBy: { name: 'asc' } },
} satisfies Prisma.ProjectSelect;

export const PROJECT_LOCATION_SELECT = {
  ...PROJECT_TERRITORY_SELECT,
  localities: {
    select: { departmentId: true, city: true, neighborhood: true },
    orderBy: { id: 'asc' },
  },
} satisfies Prisma.ProjectSelect;

type TerritoryInput = Pick<ProjectLocation, 'geographicScope' | 'countries'> & {
  departments: { name: string }[];
};

export function getTerritoryNames({ geographicScope, departments, countries }: TerritoryInput) {
  return geographicScope === 'international' ? countries : departments.map(({ name }) => name);
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
