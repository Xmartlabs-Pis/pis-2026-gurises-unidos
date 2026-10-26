import type { Prisma, UserRole } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { getActiveBeneficiaryCategories } from '@/lib/beneficiary-categories';
import { getMetricValues } from '@/lib/metrics/queries';
import { getCurrentYear } from '@/lib/metrics/year';
import { sumBeneficiaryCounts } from '@/lib/projects/beneficiary-values';
import { getReportProjectScope } from '@/lib/projects/permissions';
import { formatDelta } from '@/lib/reports/format';

export type ReportKpi = { value: number; label: string; delta: string | null };

export type ReportBar = { label: string; value: number };

export type ImpactReportData = {
  year: number;
  generatedAt: Date;
  projectCount: number;
  pendingProjects: number | null;
  kpis: ReportKpi[];
  topics: ReportBar[];
  categories: ReportBar[];
  departments: ReportBar[];
  departmentTotal: number;
  internationalCountries: string[];
};

type ReportUser = { id: number; role: UserRole };

function countBy(groups: string[][]) {
  const counts = new Map<string, number>();
  for (const name of groups.flat()) {
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return [...counts]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'es'));
}

export function getImpactReportFileName(year: number) {
  return `Informe-de-impacto-${year}.pdf`;
}

export async function getImpactReportData(
  user: ReportUser,
  year: number
): Promise<ImpactReportData | null> {
  const projectWhere: Prisma.ProjectWhereInput = getReportProjectScope(user);
  const previousYear = year - 1;
  const isCurrentYear = year === getCurrentYear();

  const [current, previous, projects, categories, categoryTotals, departmentTotal, pending] =
    await Promise.all([
      getMetricValues(year, projectWhere),
      getMetricValues(previousYear, projectWhere),
      prisma.project.findMany({
        where: { ...projectWhere, deletedAt: null, projectBeneficiaries: { some: { year } } },
        select: {
          geographicScope: true,
          countries: true,
          topics: { select: { name: true } },
          departments: { select: { name: true } },
        },
      }),
      getActiveBeneficiaryCategories(),
      sumBeneficiaryCounts({ year, project: { ...projectWhere, deletedAt: null } }),
      prisma.department.count(),
      isCurrentYear
        ? prisma.project.count({
            where: {
              AND: [projectWhere, { OR: [{ endYear: null }, { endYear: { gte: year } }] }],
              deletedAt: null,
              status: 'active',
              startYear: { lte: year },
              projectBeneficiaries: { none: { year } },
            },
          })
        : null,
    ]);

  if (current.active_projects === 0) return null;

  const hasPrevious = previous.active_projects > 0;
  const previousValue = (value: number) => (hasPrevious ? value : null);

  return {
    year,
    generatedAt: new Date(),
    projectCount: current.active_projects,
    pendingProjects: pending,
    kpis: [
      {
        value: current.children_reached,
        label: 'niños, niñas y adolescentes alcanzados',
        delta: formatDelta(
          current.children_reached,
          previousValue(previous.children_reached),
          previousYear,
          'percent'
        ),
      },
      {
        value: current.families,
        label: 'familias acompañadas',
        delta: formatDelta(
          current.families,
          previousValue(previous.families),
          previousYear,
          'percent'
        ),
      },
      {
        value: current.teachers,
        label: 'docentes y educadores capacitados',
        delta: formatDelta(
          current.teachers,
          previousValue(previous.teachers),
          previousYear,
          'percent'
        ),
      },
      {
        value: current.active_projects,
        label: 'proyectos activos',
        delta: formatDelta(
          current.active_projects,
          previousValue(previous.active_projects),
          previousYear,
          'count'
        ),
      },
    ],
    topics: countBy(projects.map(({ topics }) => topics.map(({ name }) => name))),
    categories: categories.map(({ key, name }) => ({
      label: name,
      value: categoryTotals[key] ?? 0,
    })),
    departments: countBy(
      projects
        .filter(({ geographicScope }) => geographicScope === 'national')
        .map(({ departments }) => departments.map(({ name }) => name))
    ),
    departmentTotal,
    internationalCountries: [
      ...new Set(
        projects
          .filter(({ geographicScope }) => geographicScope === 'international')
          .flatMap(({ countries }) => countries)
      ),
    ].sort((a, b) => a.localeCompare(b, 'es')),
  };
}
