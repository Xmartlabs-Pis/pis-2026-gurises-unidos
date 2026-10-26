import { getContributors } from '@/lib/contributors';
import { MetricsForm } from '@/components/metrics/metrics-form';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
  getMetricSettings,
  getMetricValues,
  getMetricYears,
  getPublishedYears,
} from '@/lib/metrics/queries';
import { getCurrentYear, resolveYearParam } from '@/lib/metrics/year';
import { ErrorScreen } from '@/components/error-screen';
import { PageHeader } from '@/components/layout/page-header';
import { getTopicStatistics } from '@/lib/metrics/topic-statistics';

export default async function MetricsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (session.user.role !== 'admin') return <ErrorScreen code={403} />;

  const currentYear = getCurrentYear();
  const [years, publishedYears] = await Promise.all([
    getMetricYears(currentYear),
    getPublishedYears(currentYear),
  ]);
  const year = resolveYearParam((await searchParams).year, years, publishedYears[0]);
  const [values, initialMetrics, initialTopics, contributors] = await Promise.all([
    getMetricValues(year),
    getMetricSettings(),
    getTopicStatistics(year),
    getContributors(),
  ]);

  return (
    <main className="bg-primary-foreground flex flex-1 flex-col">
      <PageHeader
        className="mx-auto w-full max-w-[1185px] px-6 pt-6 pb-2.5"
        eyebrow="Gestión de métricas"
        title="Indicadores institucionales"
        description="Estas cifras se publican automáticamente en el sitio público de Gurises Unidos."
      />
      <div className="flex w-full flex-1 flex-col gap-4 pt-1.5">
        <MetricsForm
          contributors={contributors}
          year={String(year)}
          values={values}
          initialMetrics={initialMetrics}
          initialTopics={initialTopics}
          years={years}
          initialPublishedYears={publishedYears}
        />
      </div>
    </main>
  );
}
