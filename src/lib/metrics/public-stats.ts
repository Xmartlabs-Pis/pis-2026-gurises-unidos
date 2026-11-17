import { formatNumber } from '@/lib/format';
import type { MetricSetting } from '@/lib/metrics/queries';
import type { MetricValues } from '@/lib/metrics/types';

export function getPublicStats(settings: MetricSetting[], values: MetricValues) {
  return settings
    .filter((metric) => metric.showPublicly)
    .map((metric) => ({
      key: metric.key,
      value: formatNumber(values[metric.key]),
      description: metric.name,
    }));
}
