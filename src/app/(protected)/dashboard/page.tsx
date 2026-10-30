import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import type { UserRole } from '@/generated/prisma/enums';
import { DashboardQuickActions } from '@/components/dashboard/quick-actions';
import { HeroKpiCard } from '@/components/dashboard/hero-kpi-card';
import { KpiCard } from '@/components/dashboard/kpi-card';
import { ProjectsOverviewTable } from '@/components/dashboard/projects-overview-table';
import { MetricsYearSelect } from '@/components/metrics/metrics-year-select';
import { getDashboardOverview } from '@/lib/dashboard/queries';
import { getMetricYears } from '@/lib/metrics/queries';
import { getCurrentYear, resolveYearParam } from '@/lib/metrics/year';

const ALLOWED_ROLES: UserRole[] = ['admin', 'coordinator'];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string | string[] }>;
}) {
  const session = await auth();
  if (!session?.user) redirect('/login');
  if (!ALLOWED_ROLES.includes(session.user.role)) redirect('/dashboard/projects');

  const currentYear = getCurrentYear();
  const years = await getMetricYears(currentYear);
  const year = resolveYearParam((await searchParams).year, years, currentYear);
  const { heroKpi, secondaryKpis, projects, projectsTotal } = await getDashboardOverview(year);

  return (
    <div className="bg-surface-page flex flex-1 flex-col gap-4 p-4 lg:px-6 lg:py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <DashboardQuickActions />
        <MetricsYearSelect year={year} years={years} label="Año" />
      </div>

      <HeroKpiCard kpi={heroKpi} />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {secondaryKpis.map((kpi, index) => (
          <KpiCard
            key={kpi.label}
            kpi={kpi}
            className={index === 2 ? 'col-span-2 md:col-span-1' : undefined}
          />
        ))}
      </div>

      <ProjectsOverviewTable projects={projects} total={projectsTotal} year={year} />
    </div>
  );
}
