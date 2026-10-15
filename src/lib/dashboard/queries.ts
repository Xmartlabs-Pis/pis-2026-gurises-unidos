import type { Intensity, ProjectStatus } from '@/generated/prisma/enums';
import prisma from '@/lib/prisma';
import { getMetricValues } from '@/lib/metrics/queries';
import { BENEFICIARY_VALUES_SELECT, toBeneficiaryCounts } from '@/lib/projects/beneficiary-values';
import { getChildrenReached } from '@/lib/projects/detail-metrics';

export type DashboardKpi = {
  value: number;
  label: string;
  delta: string;
};

export type DashboardProjectRow = {
  id: number;
  name: string;
  status: ProjectStatus;
  intensity: Intensity | null;
  beneficiaries: number;
};

function formatPercentDelta(current: number, previous: number) {
  if (previous === 0) return 'Sin datos del año anterior';
  const percent = Number((((current - previous) / previous) * 100).toFixed(1));
  if (percent === 0) return 'Sin cambios vs. año anterior';
  const sign = percent > 0 ? '+' : '−';
  return `${sign}${Math.abs(percent).toFixed(1)}% vs. año anterior`;
}

function formatCountDelta(current: number, previous: number, previousYear: number) {
  const difference = current - previous;
  if (difference === 0) return `Sin cambios respecto a ${previousYear}`;
  const sign = difference > 0 ? '+' : '−';
  return `${sign}${Math.abs(difference)} respecto a ${previousYear}`;
}

async function getProjectsWithActivity(year: number): Promise<DashboardProjectRow[]> {
  const projects = await prisma.project.findMany({
    where: { deletedAt: null, projectBeneficiaries: { some: { year } } },
    select: {
      id: true,
      name: true,
      status: true,
      intensity: true,
      projectBeneficiaries: {
        where: { year },
        select: BENEFICIARY_VALUES_SELECT,
      },
    },
    orderBy: { name: 'asc' },
  });

  return projects.map(({ projectBeneficiaries, ...project }) => ({
    ...project,
    beneficiaries: projectBeneficiaries.reduce(
      (sum, record) => sum + (getChildrenReached(toBeneficiaryCounts(record.values)) ?? 0),
      0
    ),
  }));
}

export async function getDashboardOverview(year: number) {
  const previousYear = year - 1;
  const [current, previous, projects] = await Promise.all([
    getMetricValues(year),
    getMetricValues(previousYear),
    getProjectsWithActivity(year),
  ]);

  const heroKpi: DashboardKpi = {
    value: current.children_reached,
    label: `niños, niñas y adolescentes alcanzados en ${year}`,
    delta: formatPercentDelta(current.children_reached, previous.children_reached),
  };

  const secondaryKpis: DashboardKpi[] = [
    {
      value: current.families,
      label: `familias acompañadas en ${year}`,
      delta: formatPercentDelta(current.families, previous.families),
    },
    {
      value: current.teachers,
      label: `funcionarios de servicios básicos formados en ${year}`,
      delta: formatPercentDelta(current.teachers, previous.teachers),
    },
    {
      value: current.active_projects,
      label: `proyectos con actividad en ${year}`,
      delta: formatCountDelta(current.active_projects, previous.active_projects, previousYear),
    },
  ];

  return {
    heroKpi,
    secondaryKpis,
    projects,
    projectsTotal: projects.reduce((sum, project) => sum + project.beneficiaries, 0),
  };
}
