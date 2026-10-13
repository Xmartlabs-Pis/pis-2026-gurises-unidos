import prisma from '@/lib/prisma';
import { Prisma } from '@/generated/prisma/client';
import { sumBeneficiaries, type BeneficiaryCounts } from '@/lib/project-display';
import { BENEFICIARY_VALUES_SELECT, toBeneficiaryCounts } from '@/lib/projects/beneficiary-values';
import type { ProjectFilters } from '@/lib/validation/project-filters';

const PROJECT_LIST_SELECT = {
  id: true,
  name: true,
  status: true,
  intensity: true,
  startYear: true,
  zone: true,
  localityNeighborhood: true,
  publicDescription: true,
  coverPhoto: true,
  leadCoordinator: { select: { id: true, firstName: true, lastName: true } },
  department: { select: { id: true, name: true } },
  projectBeneficiaries: {
    orderBy: { year: 'desc' },
    select: { year: true, ...BENEFICIARY_VALUES_SELECT },
  },
} satisfies Prisma.ProjectSelect;

type ProjectListRow = Prisma.ProjectGetPayload<{ select: typeof PROJECT_LIST_SELECT }>;

export type ProjectListItem = Omit<ProjectListRow, 'projectBeneficiaries'> & {
  beneficiaries: (BeneficiaryCounts & { year: number; total: number })[];
};

export type ProjectListPage = {
  items: ProjectListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function buildProjectWhere(filters: ProjectFilters): Prisma.ProjectWhereInput {
  const where: Prisma.ProjectWhereInput = { deletedAt: null };

  if (filters.search) {
    where.name = { contains: filters.search, mode: 'insensitive' };
  }
  if (filters.status) {
    where.status = filters.status;
  }
  if (filters.intensity) {
    where.intensity = filters.intensity;
  }
  if (filters.leadCoordinatorId) {
    where.leadCoordinatorId = filters.leadCoordinatorId;
  }
  if (filters.departmentId) {
    where.departmentId = filters.departmentId;
  }
  if (filters.topicId) {
    where.topicId = filters.topicId;
  }
  if (filters.startYearFrom !== undefined || filters.startYearTo !== undefined) {
    where.startYear = { gte: filters.startYearFrom, lte: filters.startYearTo };
  }
  if (filters.beneficiaryYear !== undefined) {
    where.projectBeneficiaries = { some: { year: filters.beneficiaryYear } };
  }

  return where;
}

function toListItem({ projectBeneficiaries, ...project }: ProjectListRow): ProjectListItem {
  return {
    ...project,
    beneficiaries: projectBeneficiaries.map(({ year, values }) => {
      const counts = toBeneficiaryCounts(values);
      return { year, ...counts, total: sumBeneficiaries(counts) };
    }),
  };
}

export async function listProjects(filters: ProjectFilters): Promise<ProjectListPage> {
  const where = buildProjectWhere(filters);
  const total = await prisma.project.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const page = Math.min(filters.page, totalPages);

  const rows =
    total === 0
      ? []
      : await prisma.project.findMany({
          where,
          select: {
            ...PROJECT_LIST_SELECT,
            projectBeneficiaries: {
              ...PROJECT_LIST_SELECT.projectBeneficiaries,
              where: { year: filters.beneficiaryYear },
              take: 1,
            },
          },
          orderBy: [{ name: 'asc' }, { id: 'asc' }],
          skip: (page - 1) * filters.pageSize,
          take: filters.pageSize,
        });

  return {
    items: rows.map(toListItem),
    total,
    page,
    pageSize: filters.pageSize,
    totalPages,
  };
}

export async function listBeneficiaryYears(): Promise<number[]> {
  const rows = await prisma.projectBeneficiary.findMany({
    where: { project: { deletedAt: null } },
    distinct: ['year'],
    select: { year: true },
    orderBy: { year: 'desc' },
  });

  return rows.map(({ year }) => year);
}

export async function listProjectFilterOptions() {
  const [departments, topics] = await Promise.all([
    prisma.department.findMany({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
    prisma.topic.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return { departments, topics };
}
