import { formatNumber } from '@/lib/format';
import type { ProjectDetail } from '@/lib/projects/detail';

const PERCENTAGE_FORMATTER = new Intl.NumberFormat('es-UY', {
  maximumFractionDigits: 1,
});

function formatSignedNumber(value: number) {
  if (value === 0) return '0';
  return `${value > 0 ? '+' : '−'}${formatNumber(Math.abs(value))}`;
}

function formatSignedPercentage(value: number) {
  if (value === 0) return '0%';
  return `${value > 0 ? '+' : '−'}${PERCENTAGE_FORMATTER.format(Math.abs(value))}%`;
}

function formatMetricValue(value: number | null) {
  return value === null ? '—' : formatNumber(value);
}

function comparisonCopy(value: number | null, comparisonYear: number) {
  if (value === null) return `Sin datos de ${comparisonYear}`;
  if (value === 0) return `Sin cambios vs. ${comparisonYear}`;
  return `${formatSignedNumber(value)} vs. ${comparisonYear}`;
}

function percentageComparisonCopy(
  value: number | null,
  absoluteChange: number | null,
  comparisonYear: number,
  previousValue: number | null
) {
  if (previousValue === null) return `Sin datos de ${comparisonYear}`;
  if (value === null && absoluteChange !== null) {
    return comparisonCopy(absoluteChange, comparisonYear);
  }
  if (value === null) return 'Sin base de comparación';
  if (value === 0) return 'Sin cambios vs. año anterior';
  return `${formatSignedPercentage(value)} vs. año anterior`;
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="border-border bg-card flex min-h-[156px] flex-col rounded-[14px] border px-6 py-6 sm:min-h-32 sm:px-5 sm:py-5">
      <dt className="order-2 mt-0.5 text-sm font-medium">{label}</dt>
      <dd className="order-1 text-[2rem] leading-10 font-bold tracking-tight tabular-nums">
        {value}
      </dd>
      <p className="text-muted-foreground order-3 mt-1 text-sm">{detail}</p>
    </div>
  );
}

export function ProjectMetrics({
  metrics,
  comparisonYear,
}: {
  metrics: ProjectDetail['metrics'];
  comparisonYear: number;
}) {
  const institutionCopy =
    metrics.institutions.trend === null
      ? `Sin datos de ${comparisonYear}`
      : {
          increased: 'En crecimiento',
          stable: 'Estable',
          decreased: 'En descenso',
        }[metrics.institutions.trend];
  const annualGrowthValue =
    metrics.annualGrowth === null ? '—' : formatSignedPercentage(metrics.annualGrowth);

  return (
    <section aria-labelledby="project-metrics-title">
      <h2 id="project-metrics-title" className="sr-only">
        Métricas del proyecto
      </h2>
      <dl className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <MetricCard
          label="NNA alcanzados"
          value={formatMetricValue(metrics.childrenReached.value)}
          detail={comparisonCopy(metrics.childrenReached.absoluteChange, comparisonYear)}
        />
        <MetricCard
          label="Familias acompañadas"
          value={formatMetricValue(metrics.families.value)}
          detail={percentageComparisonCopy(
            metrics.families.percentageChange,
            metrics.families.absoluteChange,
            comparisonYear,
            metrics.families.previousValue
          )}
        />
        <MetricCard
          label="Instituciones vinculadas"
          value={formatMetricValue(metrics.institutions.value)}
          detail={institutionCopy}
        />
        <MetricCard label="Crecimiento anual" value={annualGrowthValue} detail="Año sobre año" />
      </dl>
    </section>
  );
}
