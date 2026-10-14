import prisma from '@/lib/prisma';
import { METRIC_DEFINITIONS } from '@/lib/metrics/constants';
import { sumBeneficiaryCounts } from '@/lib/projects/beneficiary-values';

export async function getMetricSettings(splitChildren = false) {
  const savedMetrics = await prisma.metric.findMany({
    select: { key: true, showPublicly: true },
  });
  const definitions = splitChildren
    ? METRIC_DEFINITIONS
    : [
        {
          key: 'children_reached' as const,
          name: 'NNA alcanzados',
          description: 'Niños, niñas y adolescentes alcanzados con acciones directas e indirectas.',
          showPublicly: true,
        },
        ...METRIC_DEFINITIONS.slice(2),
      ];
  const childrenVisibility = savedMetrics.find(
    (metric) => metric.key === 'children_reached'
  )?.showPublicly;
  return definitions.map((metric) => ({
    ...metric,
    showPublicly:
      savedMetrics.find((saved) => saved.key === metric.key)?.showPublicly ??
      (metric.key === 'direct_children_reached' || metric.key === 'indirect_children_reached'
        ? childrenVisibility
        : undefined) ??
      metric.showPublicly,
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
  const [totals, projectRecords] = await Promise.all([
    sumBeneficiaryCounts(where),
    prisma.projectBeneficiary.findMany({
      where,
      select: {
        projectId: true,
        project: { select: { departmentId: true } },
      },
    }),
  ]);

  return {
    children_reached: totals.directChildrenAdolescents + totals.indirectChildrenAdolescents,
    direct_children_reached: totals.directChildrenAdolescents,
    indirect_children_reached: totals.indirectChildrenAdolescents,
    families: totals.families,
    teachers: totals.basicServiceStaff,
    institutions: totals.coordinatedInstitutions,
    departments: new Set(projectRecords.map(({ project }) => project.departmentId)).size,
    active_projects: projectRecords.length,
  };
}

export type MetricValues = Awaited<ReturnType<typeof getMetricValues>>;
