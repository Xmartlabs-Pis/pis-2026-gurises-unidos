import { describe, expect, it } from 'vitest';
import { getLocationLabel, getTerritoryLabel } from '@/lib/projects/location';

const NATIONAL = {
  geographicScope: 'national' as const,
  departments: [{ name: 'Canelones' }, { name: 'Montevideo' }],
  countries: [],
  cities: ['Las Piedras', 'Pando'],
  neighborhoods: ['Centro'],
};

const INTERNATIONAL = {
  geographicScope: 'international' as const,
  departments: [],
  countries: ['Argentina', 'Brasil'],
  cities: [],
  neighborhoods: [],
};

describe('getTerritoryLabel', () => {
  it('lists the departments of a national project', () => {
    expect(getTerritoryLabel(NATIONAL)).toBe('Canelones, Montevideo');
  });

  it('lists the countries of an international project', () => {
    expect(getTerritoryLabel(INTERNATIONAL)).toBe('Argentina, Brasil');
  });
});

describe('getLocationLabel', () => {
  it('adds the optional cities and neighborhoods after the departments', () => {
    expect(getLocationLabel(NATIONAL)).toBe('Canelones, Montevideo — Las Piedras, Pando — Centro');
  });

  it('omits the levels without values', () => {
    expect(getLocationLabel({ ...NATIONAL, cities: [], neighborhoods: [] })).toBe(
      'Canelones, Montevideo'
    );
    expect(getLocationLabel(INTERNATIONAL)).toBe('Argentina, Brasil');
  });
});
