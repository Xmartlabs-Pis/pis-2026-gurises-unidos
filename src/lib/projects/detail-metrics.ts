import type { BeneficiaryCounts } from '@/lib/project-display';

export type MetricTrend = 'increased' | 'stable' | 'decreased';

export type MetricComparison = {
  value: number | null;
  previousValue: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
  trend: MetricTrend | null;
};

type ChildrenCounts = Pick<
  BeneficiaryCounts,
  'directChildrenAdolescents' | 'indirectChildrenAdolescents'
>;

export function getChildrenReached(record: ChildrenCounts | null): number | null {
  if (record === null) {
    return null;
  }

  return record.directChildrenAdolescents + record.indirectChildrenAdolescents;
}

export function getPeopleReached(record: BeneficiaryCounts | null): number | null {
  if (record === null) {
    return null;
  }

  return (
    record.directChildrenAdolescents +
    record.indirectChildrenAdolescents +
    record.youth18To29 +
    record.communityLeaders +
    record.basicServiceStaff
  );
}

export function calculatePercentage(
  numerator: number | null,
  denominator: number | null
): number | null {
  if (numerator === null || denominator === null || denominator === 0) {
    return null;
  }

  return (numerator / denominator) * 100;
}

export function compareMetric(
  value: number | null,
  previousValue: number | null
): MetricComparison {
  if (value === null || previousValue === null) {
    return {
      value,
      previousValue,
      absoluteChange: null,
      percentageChange: null,
      trend: null,
    };
  }

  const absoluteChange = value - previousValue;
  const trend: MetricTrend =
    absoluteChange > 0 ? 'increased' : absoluteChange < 0 ? 'decreased' : 'stable';

  return {
    value,
    previousValue,
    absoluteChange,
    percentageChange: calculatePercentage(absoluteChange, previousValue),
    trend,
  };
}
