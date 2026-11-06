import { Suspense } from 'react';
import { getPartners } from '@/lib/partners';
import { MetricsForm } from '@/components/metrics/metrics-form';
import { MetricsFormSkeleton } from '@/components/metrics/metrics-form-skeleton';
import { requireAdmin } from '@/lib/auth/require-admin';
import {
  getMetricSettings,
  getMetricValues,
  getMetricYears,
  getPublishedYears,
} from '@/lib/metrics/queries';
import { getCurrentYear, resolveYearParam } from '@/lib/metrics/year';
import { PageHeader } from '@/components/layout/page-header';
import { getTopicVisibilitySettings } from '@/lib/metrics/topic-visibility';

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  await requireAdmin();

  return (
    <main className="bg-primary-foreground flex flex-1 flex-col">
      <PageHeader
        className="mx-auto w-full max-w-[1185px] px-6 pt-6 pb-2.5"
        eyebrow="Gestión de métricas"
        title="Indicadores institucionales"
        description="Estas cifras se publican automáticamente en el reporte público de Gurises Unidos."
      />
      <div className="flex w-full flex-1 flex-col gap-4 pt-1.5">
        <Suspense fallback={<MetricsFormSkeleton />}>
          <MetricsContent searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function MetricsContent({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  const currentYear = getCurrentYear();
  const [years, publishedYears] = await Promise.all([
    getMetricYears(currentYear),
    getPublishedYears(currentYear),
  ]);
  const year = resolveYearParam((await searchParams).year, years, publishedYears[0]);
  const [values, initialMetrics, initialTopics, partners] = await Promise.all([
    getMetricValues(year),
    getMetricSettings(),
    getTopicVisibilitySettings(year),
    getPartners(),
  ]);

  return (
    <MetricsForm
      partners={partners}
      year={String(year)}
      values={values}
      initialMetrics={initialMetrics}
      initialTopics={initialTopics}
      years={years}
      initialPublishedYears={publishedYears}
    />
  );
}
