import { expect, it } from 'vitest';
import { METRIC_DEFINITIONS } from '@/lib/metrics/constants';
import { getPublicStats } from '@/lib/metrics/public-stats';
import type { MetricValues } from '@/lib/metrics/queries';

it('formats only the publicly shown metrics, keeping their order', () => {
  const settings = METRIC_DEFINITIONS.map((metric) => ({
    ...metric,
    showPublicly: metric.key === 'families' || metric.key === 'children_reached',
  }));
  const values = { children_reached: 6315, families: 800 } as MetricValues;

  expect(getPublicStats(settings, values)).toEqual([
    { key: 'children_reached', value: '6.315', description: 'Total de NNA' },
    { key: 'families', value: '800', description: 'Familias acompañadas' },
  ]);
});
