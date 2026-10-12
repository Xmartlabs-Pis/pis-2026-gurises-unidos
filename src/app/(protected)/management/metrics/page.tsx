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
    getMetricSettings(),
    getTopicStatistics(year),
  ]);

  return (
    <main className="bg-primary-foreground flex flex-1 flex-col px-6">
      <header className="mx-auto flex w-full max-w-[1185px] flex-col gap-1.5 px-6 pt-6 pb-2.5">
        <p className="text-muted-foreground w-fit font-sans text-sm leading-5 font-normal tracking-normal">
          Gestión de métricas
        </p>
        <h1 className="text-foreground w-fit font-sans text-3xl leading-9 font-bold tracking-normal">
          Indicadores institucionales {year}
        </h1>
        <p className="text-muted-foreground w-fit font-sans text-sm leading-5 font-normal tracking-normal">
          Estas cifras se publican automáticamente en el sitio público de Gurises Unidos.
        </p>
      </header>
      <div className="mx-auto flex w-full max-w-[1185px] flex-1 flex-col gap-4 pt-1.5 pb-6">
        <div className="flex flex-col gap-2 px-6">
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
