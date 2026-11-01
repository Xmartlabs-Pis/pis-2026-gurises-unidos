import type { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { METRIC_DEFINITIONS } from '@/lib/metrics/constants';
import { sumBeneficiaryCounts } from '@/lib/projects/beneficiary-values';
import { getCurrentYear } from '@/lib/metrics/year';

export async function getMetricSettings() {
  const savedMetrics = await prisma.metric.findMany({
    select: { key: true, showPublicly: true },
  });
  return METRIC_DEFINITIONS.map((metric) => ({
    ...metric,
    showPublicly:
      savedMetrics.find((saved) => saved.key === metric.key)?.showPublicly ?? metric.showPublicly,
  }));
}

export async function getPublishedYears(currentYear = getCurrentYear()) {
  const [settings, availableYears] = await Promise.all([
    prisma.publicSettings.findUnique({
      where: { id: 1 },
      select: { publishedYears: true },
    }),
    getMetricYears(currentYear),
  ]);
  const publishedYears = availableYears.filter((year) => settings?.publishedYears.includes(year));
  return publishedYears.length ? publishedYears : availableYears;
}

export type MetricSetting = Awaited<ReturnType<typeof getMetricSettings>>[number];

export async function getMetricYears(currentYear: number) {
  const beneficiaries = await prisma.projectBeneficiary.findMany({
    where: { project: { deletedAt: null } },
    select: { year: true },
    distinct: ['year'],
  });

  return [...new Set([currentYear - 1, currentYear, ...beneficiaries.map(({ year }) => year)])]
    .filter((year) => year <= currentYear)
    .sort((a, b) => b - a);
}

export async function getMetricValues(year: number, projectWhere: Prisma.ProjectWhereInput = {}) {
  const where = { year, project: { ...projectWhere, deletedAt: null } };
  const [totals, activeProjects] = await Promise.all([
    sumBeneficiaryCounts(where),
    prisma.projectBeneficiary.count({ where }),
  ]);

  return {
    children_reached: totals.directChildrenAdolescents + totals.indirectChildrenAdolescents,
    direct_children_reached: totals.directChildrenAdolescents,
    indirect_children_reached: totals.indirectChildrenAdolescents,
    families: totals.families,
    teachers: totals.basicServiceStaff,
    institutions: totals.coordinatedInstitutions,
    active_projects: activeProjects,
  };
}

export type MetricValues = Awaited<ReturnType<typeof getMetricValues>>;
