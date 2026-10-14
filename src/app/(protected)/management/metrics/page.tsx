import { MetricsForm } from '@/components/metrics/metrics-form';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import {
  getMetricSettings,
  getMetricValues,
  getMetricYears,
  getReferenceYear,
} from '@/lib/metrics/queries';
import { getCurrentYear, resolveYearParam } from '@/lib/metrics/year';
import { MetricsYearSelect } from '@/components/metrics/metrics-year-select';
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
  const [years, referenceYear] = await Promise.all([
    getMetricYears(currentYear),
    getReferenceYear(currentYear),
  ]);
  const year = resolveYearParam((await searchParams).year, years, referenceYear);
  const [values, initialMetrics, initialTopics] = await Promise.all([
    getMetricValues(year),
    getMetricSettings(true),
    getTopicStatistics(year),
  ]);

  return (
    <main className="bg-primary-foreground flex flex-1 flex-col">
      <PageHeader
        className="mx-auto w-full max-w-[1185px] px-6 pt-6 pb-2.5"
        eyebrow="Gestión de métricas"
        title={`Indicadores institucionales ${year}`}
        description="Estas cifras se publican automáticamente en el sitio público de Gurises Unidos."
      />
      <div className="flex w-full flex-1 flex-col gap-4 pt-1.5">
        <div className="mx-auto flex w-full max-w-[1185px] flex-col gap-2 px-6">
          <p className="text-muted-foreground font-sans text-sm leading-5 font-normal tracking-normal">
            Año mostrado actualmente en el sitio público: {referenceYear}
          </p>
          <MetricsYearSelect year={year} years={years} />
        </div>
        <MetricsForm
          key={year}
          year={String(year)}
          values={values}
          initialMetrics={initialMetrics}
          initialTopics={initialTopics}
        />
      </div>
    </main>
  );
}
