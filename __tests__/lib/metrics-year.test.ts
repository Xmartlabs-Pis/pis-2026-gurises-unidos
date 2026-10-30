import { describe, expect, it } from 'vitest';
import { getCurrentYear, resolveYearParam } from '@/lib/metrics/year';

describe('getCurrentYear', () => {
  it('uses the Montevideo calendar year instead of UTC', () => {
    expect(getCurrentYear(new Date('2027-01-01T02:59:00.000Z'))).toBe(2026);
    expect(getCurrentYear(new Date('2027-01-01T03:00:00.000Z'))).toBe(2027);
  });
});

describe('resolveYearParam', () => {
  const years = [2026, 2025, 2024];

  it('returns the requested year when it is available', () => {
    expect(resolveYearParam('2024', years, 2026)).toBe(2024);
  });

  it.each([undefined, '', '1990', '2027', 'abc', '2024.5', ['2024', '2025']])(
    'falls back for %j',
    (value) => {
      expect(resolveYearParam(value, years, 2025)).toBe(2025);
    }
  );
});
