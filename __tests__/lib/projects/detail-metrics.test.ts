import { describe, expect, it } from 'vitest';
import {
  calculatePercentage,
  compareMetric,
  getChildrenReached,
  getPeopleReached,
} from '@/lib/projects/detail-metrics';
import type { BeneficiaryCounts } from '@/lib/project-display';
import { parseProjectDetailInput } from '@/lib/validation/project-detail';

const BENEFICIARY_COUNTS: BeneficiaryCounts = {
  directChildrenAdolescents: 100,
  indirectChildrenAdolescents: 20,
  youth18To29: 30,
  families: 40,
  coordinatedInstitutions: 5,
  communityLeaders: 6,
  basicServiceStaff: 7,
};

describe('getChildrenReached', () => {
  it('adds direct and indirect children only', () => {
    expect(getChildrenReached(BENEFICIARY_COUNTS)).toBe(120);
  });

  it('preserves missing records', () => {
    expect(getChildrenReached(null)).toBeNull();
  });
});

describe('getPeopleReached', () => {
  it('adds people only, excluding families and institutions', () => {
    expect(getPeopleReached(BENEFICIARY_COUNTS)).toBe(163);
  });

  it('preserves missing records', () => {
    expect(getPeopleReached(null)).toBeNull();
  });
});

describe('compareMetric', () => {
  it('calculates absolute and percentage growth', () => {
    expect(compareMetric(120, 100)).toEqual({
      value: 120,
      previousValue: 100,
      absoluteChange: 20,
      percentageChange: 20,
      trend: 'increased',
    });
  });

  it('calculates a decrease', () => {
    expect(compareMetric(80, 100)).toMatchObject({
      absoluteChange: -20,
      percentageChange: -20,
      trend: 'decreased',
    });
  });

  it('identifies stable values', () => {
    expect(compareMetric(5, 5)).toMatchObject({
      absoluteChange: 0,
      percentageChange: 0,
      trend: 'stable',
    });
  });

  it('preserves zero as a recorded value', () => {
    expect(compareMetric(0, 10)).toMatchObject({
      value: 0,
      absoluteChange: -10,
      percentageChange: -100,
    });
  });

  it('does not divide by zero', () => {
    expect(compareMetric(10, 0)).toMatchObject({
      absoluteChange: 10,
      percentageChange: null,
      trend: 'increased',
    });
  });

  it('keeps a zero baseline percentage undefined', () => {
    expect(compareMetric(0, 0)).toMatchObject({
      value: 0,
      absoluteChange: 0,
      percentageChange: null,
      trend: 'stable',
    });
  });

  it('does not replace missing data with zero', () => {
    expect(compareMetric(null, 10)).toEqual({
      value: null,
      previousValue: 10,
      absoluteChange: null,
      percentageChange: null,
      trend: null,
    });
  });

  it('does not invent a previous year', () => {
    expect(compareMetric(10, null)).toMatchObject({
      value: 10,
      previousValue: null,
      absoluteChange: null,
      percentageChange: null,
      trend: null,
    });
  });
});

describe('calculatePercentage', () => {
  it('calculates national participation', () => {
    expect(calculatePercentage(342, 4286)).toBeCloseTo(7.98, 2);
  });

  it('returns null for an empty national total', () => {
    expect(calculatePercentage(0, 0)).toBeNull();
  });
});

describe('parseProjectDetailInput', () => {
  it('accepts string parameters', () => {
    expect(parseProjectDetailInput('12', '2025', 2026)).toEqual({
      success: true,
      data: { projectId: 12, year: 2025 },
    });
  });

  it('allows an omitted year', () => {
    expect(parseProjectDetailInput('12', undefined, 2026)).toEqual({
      success: true,
      data: { projectId: 12, year: undefined },
    });
  });

  it.each(['0', '-1', 'abc', '1.5', '2147483648'])('rejects invalid project ID %s', (id) => {
    expect(parseProjectDetailInput(id, '2025', 2026)).toEqual({
      success: false,
      field: 'projectId',
    });
  });

  it.each([
    { year: '1988' },
    { year: '2027' },
    { year: '2025.5' },
    { year: '' },
    { year: 'abc' },
    { year: ['2025'] },
    { year: null },
  ])('rejects invalid year $year', ({ year }) => {
    expect(parseProjectDetailInput('12', year, 2026)).toEqual({
      success: false,
      field: 'year',
    });
  });

  it.each([1989, 2026])('accepts boundary year %i', (year) => {
    expect(parseProjectDetailInput(12, year, 2026)).toEqual({
      success: true,
      data: { projectId: 12, year },
    });
  });
});
