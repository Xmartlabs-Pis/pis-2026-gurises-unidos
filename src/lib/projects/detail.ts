import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/auth/require-user';
import { FIRST_PROJECT_YEAR } from '@/lib/project-display';
import { getActiveBeneficiaryCategories } from '@/lib/beneficiary-categories';
import {
  calculatePercentage,
  compareMetric,
  getChildrenReached,
  getPeopleReached,
} from '@/lib/projects/detail-metrics';
import { canEditProject } from '@/lib/projects/permissions';
import {
  BENEFICIARY_VALUES_SELECT,
  sumBeneficiaryValues,
  toBeneficiaryCounts,
} from '@/lib/projects/beneficiary-values';
import { parseProjectDetailInput } from '@/lib/validation/project-detail';

export async function getProjectDetail(rawProjectId: unknown, rawYear?: unknown) {
  const user = await requireUser();

  const currentYear = new Date().getFullYear();
  const parsed = parseProjectDetailInput(rawProjectId, rawYear, currentYear);

  if (!parsed.success) {
    return {
      status: 'invalidInput' as const,
      field: parsed.field,
    };
  }

  const { projectId, year } = parsed.data;

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    select: {
      id: true,
      name: true,
      status: true,
      intensity: true,
      startYear: true,
      endYear: true,
      leadCoordinatorId: true,
      generalObjective: true,
      publicDescription: true,
      coverPhoto: true,
      zone: true,
      localityNeighborhood: true,
      leadCoordinator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      department: {
        select: {
          id: true,
          name: true,
        },
      },
      topics: {
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
        },
      },
      projectBeneficiaries: {
        where: {
          year: {
            gte: FIRST_PROJECT_YEAR,
            lte: currentYear,
          },
        },
        orderBy: { year: 'desc' },
        select: { year: true },
      },
    },
  });

  if (project === null) {
    return { status: 'notFound' as const };
  }

  const selectedYear = year ?? project.projectBeneficiaries[0]?.year ?? currentYear;
  const comparisonYear = selectedYear - 1;

  const availableYears = [
    ...new Set([
      currentYear,
      selectedYear,
      ...project.projectBeneficiaries.map((record) => record.year),
    ]),
  ].sort((a, b) => b - a);

  const [currentRecord, previousRecord, nationalChildrenReached, activeProjectCount, categories] =
    await Promise.all([
      prisma.projectBeneficiary.findUnique({
        where: {
          projectId_year: {
            projectId,
            year: selectedYear,
          },
        },
        select: BENEFICIARY_VALUES_SELECT,
      }),
      prisma.projectBeneficiary.findUnique({
        where: {
          projectId_year: {
            projectId,
            year: comparisonYear,
          },
        },
        select: BENEFICIARY_VALUES_SELECT,
      }),
      sumBeneficiaryValues({ year: selectedYear, project: { deletedAt: null } }, [
        'directChildrenAdolescents',
        'indirectChildrenAdolescents',
      ]),
      prisma.project.count({ where: { status: 'active', deletedAt: null } }),
      getActiveBeneficiaryCategories(),
    ]);

  const current = currentRecord && toBeneficiaryCounts(currentRecord.values);
  const previous = previousRecord && toBeneficiaryCounts(previousRecord.values);

  const childrenReached = compareMetric(getChildrenReached(current), getChildrenReached(previous));

  const families = compareMetric(current?.families ?? null, previous?.families ?? null);

  const institutions = compareMetric(
    current?.coordinatedInstitutions ?? null,
    previous?.coordinatedInstitutions ?? null
  );
  const annualGrowth = compareMetric(
    getPeopleReached(current),
    getPeopleReached(previous)
  ).percentageChange;

  const { projectBeneficiaries: recordedYears, ...projectData } = project;
  const hasData = current !== null;

  return {
    status: 'success' as const,
    data: {
      project: projectData,
      selectedYear,
      comparisonYear,
      availableYears,
      hasData,
      hasHistoricalData: recordedYears.length > 0,
      canEdit: canEditProject(user, project),
      metrics: {
        childrenReached,
        families,
        institutions,
        annualGrowth,
      },
      distribution: categories.map(({ key, name }) => ({
        key,
        label: name,
        value: current ? (current[key] ?? 0) : null,
      })),
      institutionalContribution: {
        nationalReach: {
          projectValue: childrenReached.value,
          nationalValue: nationalChildrenReached,
          percentage: calculatePercentage(childrenReached.value, nationalChildrenReached),
        },
        activeProjects: {
          projectCount: project.status === 'active' ? 1 : 0,
          totalCount: activeProjectCount,
        },
        territories: {
          count: 1,
          items: [
            {
              department: project.department,
              zone: project.zone,
              localityNeighborhood: project.localityNeighborhood,
            },
          ],
        },
      },
    },
  };
}

export type ProjectDetailResult = Awaited<ReturnType<typeof getProjectDetail>>;

export type ProjectDetail = Extract<ProjectDetailResult, { status: 'success' }>['data'];
