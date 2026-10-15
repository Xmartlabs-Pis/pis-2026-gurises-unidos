import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/auth/require-user';
import { FIRST_PROJECT_YEAR, sumBeneficiaries } from '@/lib/project-display';
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
import { PROJECT_LOCATION_SELECT } from '@/lib/projects/location';

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
      strategicLines: {
        select: {
          id: true,
          name: true,
        },
      },
      leadCoordinatorId: true,
      generalObjective: true,
      publicDescription: true,
      coverPhoto: true,
      zone: true,
      ...PROJECT_LOCATION_SELECT,
      leadCoordinator: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
        },
      },
      topic: {
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
          values: {
            some: {
              value: { gt: 0 },
              category: { isActive: true },
            },
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

  const { projectBeneficiaries, ...projectData } = project;
  const recordedYears = projectBeneficiaries.map((record) => record.year);
  const fallbackYear = recordedYears[0] ?? currentYear;
  const selectedYear = year !== undefined && recordedYears.includes(year) ? year : fallbackYear;
  const comparisonYear = selectedYear - 1;
  const availableYears = recordedYears.length > 0 ? recordedYears : [fallbackYear];

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

  const activeCategoryKeys = new Set<string>(categories.map(({ key }) => key));
  const currentCounts =
    currentRecord &&
    toBeneficiaryCounts(
      currentRecord.values.filter(({ category }) => activeCategoryKeys.has(category.key))
    );
  const previousCounts =
    previousRecord &&
    toBeneficiaryCounts(
      previousRecord.values.filter(({ category }) => activeCategoryKeys.has(category.key))
    );
  const current = currentCounts && sumBeneficiaries(currentCounts) > 0 ? currentCounts : null;
  const previous = previousCounts && sumBeneficiaries(previousCounts) > 0 ? previousCounts : null;

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

  const hasData = current !== null;
  const territoryNames =
    project.geographicScope === 'international'
      ? project.countries
      : project.departments.map(({ name }) => name);

  return {
    status: 'success' as const,
    data: {
      project: projectData,
      selectedYear,
      comparisonYear,
      availableYears,
      hasData,
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
          count: territoryNames.length,
          items: territoryNames,
        },
      },
    },
  };
}

export type ProjectDetailResult = Awaited<ReturnType<typeof getProjectDetail>>;

export type ProjectDetail = Extract<ProjectDetailResult, { status: 'success' }>['data'];
