import { formatNumber } from '@/lib/format';
import type { MetricSetting, MetricValues } from '@/lib/metrics/queries';

export function getPublicStats(settings: MetricSetting[], values: MetricValues) {
  return settings
    .filter((metric) => metric.showPublicly)
    .map((metric) => ({
      key: metric.key,
      value: formatNumber(values[metric.key]),
      description: metric.name,
    }));
}
