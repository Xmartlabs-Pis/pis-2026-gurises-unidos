import { describe, expect, it } from 'vitest';
import { getLocationLabel, getLocationLines, getTerritoryLabel } from '@/lib/projects/location';

const NATIONAL = {
  geographicScope: 'national' as const,
  departments: [
    { id: 1, name: 'Canelones' },
    { id: 2, name: 'Montevideo' },
    { id: 3, name: 'Salto' },
  ],
  countries: [],
  region: null,
  localities: [
    { departmentId: 2, city: 'Montevideo', neighborhood: 'Cerro Norte' },
    { departmentId: 1, city: 'Las Piedras', neighborhood: null },
    { departmentId: 2, city: 'Montevideo', neighborhood: 'Casavalle' },
  ],
};

const INTERNATIONAL = {
  geographicScope: 'international' as const,
  departments: [],
  countries: ['Argentina', 'Brasil'],
  region: 'southAmerica' as const,
  localities: [],
};

describe('getTerritoryLabel', () => {
  it('lists the departments of a national project', () => {
    expect(getTerritoryLabel(NATIONAL)).toBe('Canelones, Montevideo, Salto');
  });

  it('lists the countries of an international project', () => {
    expect(getTerritoryLabel(INTERNATIONAL)).toBe('Argentina, Brasil');
  });

  it('falls back to the region of an international project without countries', () => {
    expect(getTerritoryLabel({ ...INTERNATIONAL, countries: [] })).toBe('Sudamérica');
    expect(getTerritoryLabel({ ...INTERNATIONAL, countries: [], region: null })).toBe('');
  });
});

describe('getLocationLines', () => {
  it('pairs each city and neighborhood with its department', () => {
    expect(getLocationLines(NATIONAL)).toEqual([
      'Canelones, Las Piedras',
      'Montevideo, Montevideo, Cerro Norte',
      'Montevideo, Montevideo, Casavalle',
      'Salto',
    ]);
  });

  it('lists the countries of an international project', () => {
    expect(getLocationLines(INTERNATIONAL)).toEqual(['Argentina', 'Brasil']);
    expect(getLocationLines({ ...INTERNATIONAL, countries: [] })).toEqual([]);
  });
});

describe('getLocationLabel', () => {
  it('separates the locations of a national project', () => {
    expect(getLocationLabel({ ...NATIONAL, departments: NATIONAL.departments.slice(0, 2) })).toBe(
      'Canelones, Las Piedras; Montevideo, Montevideo, Cerro Norte; Montevideo, Montevideo, Casavalle'
    );
  });

  it('shows only the departments without cities', () => {
    expect(getLocationLabel({ ...NATIONAL, localities: [] })).toBe('Canelones; Montevideo; Salto');
    expect(getLocationLabel(INTERNATIONAL)).toBe('Argentina, Brasil');
  });
});
