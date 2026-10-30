import { describe, expect, test } from 'vitest';
import { getStatsColumnsClass, WIDE_THREE_COLUMNS_CLASS } from '@/lib/metrics/stats-layout';

describe('getStatsColumnsClass', () => {
  test('narrows the container for a single card', () => {
    expect(getStatsColumnsClass(1)).toContain('lg:max-w-82');
  });

  test('fits three cards in three columns', () => {
    expect(getStatsColumnsClass(3)).toContain('lg:max-w-246');
  });

  test.each([5, 6])('uses the wide three column layout for %i cards', (count) => {
    expect(getStatsColumnsClass(count)).toBe(WIDE_THREE_COLUMNS_CLASS);
  });
});
