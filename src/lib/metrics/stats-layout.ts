const STATS_COLUMNS_CLASSES: Record<number, string> = {
  1: 'lg:grid-cols-1 lg:max-w-82',
  2: 'lg:grid-cols-2 lg:max-w-164',
  3: 'lg:grid-cols-3 lg:max-w-246',
  4: 'lg:grid-cols-4 lg:max-w-328',
};

export const WIDE_THREE_COLUMNS_CLASS = 'lg:grid-cols-3 lg:max-w-328';

export function getStatsColumnsClass(count: number) {
  if (count <= 4) return STATS_COLUMNS_CLASSES[Math.max(count, 1)];
  return count === 5 || count % 3 === 0 ? WIDE_THREE_COLUMNS_CLASS : STATS_COLUMNS_CLASSES[4];
}
