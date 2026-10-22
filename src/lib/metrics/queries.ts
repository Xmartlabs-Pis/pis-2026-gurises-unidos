import prisma from '@/lib/prisma';
import { METRIC_DEFINITIONS } from '@/lib/metrics/constants';
import { sumBeneficiaryCounts } from '@/lib/projects/beneficiary-values';

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

export async function getReferenceYear(currentYear = new Date().getFullYear()) {
  const settings = await prisma.publicSettings.findUnique({
    where: { id: 1 },
    select: { referenceYear: true },
  });
  return settings?.referenceYear ?? currentYear - 1;
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

export async function getMetricValues(year: number) {
  const where = { year, project: { deletedAt: null } };
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
