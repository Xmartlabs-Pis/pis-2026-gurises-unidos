import type { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { getHiddenPublicTopicIds } from '@/lib/metrics/topic-statistics';

export const PUBLIC_PROJECTS_PAGE_SIZE = 12;

const PUBLIC_PROJECT_ORDER = [
  { name: 'asc' },
  { id: 'asc' },
] satisfies Prisma.ProjectOrderByWithRelationInput[];

export type PublicProject = {
  id: number;
  name: string;
  department: string;
  description: string;
  coverPhoto: string | null;
  reach: number;
};

export type PublicProjectsPage = {
  items: PublicProject[];
  page: number;
  hasMore: boolean;
};

export type PublicTopic = {
  id: number;
  name: string;
  total: number;
  initialPage: PublicProjectsPage;
};

function publicProjectWhere(year: number) {
  return {
    deletedAt: null,
    showOnLanding: true,
    projectBeneficiaries: { some: { year } },
  } satisfies Prisma.ProjectWhereInput;
}

function publicProjectSelect(year: number) {
  return {
    id: true,
    name: true,
    publicDescription: true,
    coverPhoto: true,
    department: { select: { name: true } },
    projectBeneficiaries: {
      where: { year },
      take: 1,
      select: { values: { select: { value: true } } },
    },
  } satisfies Prisma.ProjectSelect;
}

type PublicProjectRow = Prisma.ProjectGetPayload<{
  select: ReturnType<typeof publicProjectSelect>;
}>;

function toPublicProject(row: PublicProjectRow): PublicProject {
  const values = row.projectBeneficiaries[0]?.values ?? [];

  return {
    id: row.id,
    name: row.name,
    department: row.department.name,
    description: row.publicDescription ?? '',
    coverPhoto: row.coverPhoto,
    reach: values.reduce((sum, { value }) => sum + value, 0),
  };
}

export async function getPublicTopics(year: number): Promise<PublicTopic[]> {
  const where = publicProjectWhere(year);
  const hiddenTopicIds = await getHiddenPublicTopicIds();
  const topics = await prisma.topic.findMany({
    where: { id: { notIn: hiddenTopicIds }, isActive: true, projects: { some: where } },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      _count: { select: { projects: { where } } },
      projects: {
        where,
        orderBy: PUBLIC_PROJECT_ORDER,
        take: PUBLIC_PROJECTS_PAGE_SIZE,
        select: publicProjectSelect(year),
      },
    },
  });

  return topics.map(({ id, name, _count, projects }) => ({
    id,
    name,
    total: _count.projects,
    initialPage: {
      items: projects.map(toPublicProject),
      page: 1,
      hasMore: _count.projects > projects.length,
    },
  }));
}

export async function getPublicProjectsPage(
  year: number,
  topicId: number,
  page: number
): Promise<PublicProjectsPage> {
  const hiddenTopicIds = await getHiddenPublicTopicIds();
  if (hiddenTopicIds.includes(topicId)) return { items: [], page, hasMore: false };
  const rows = await prisma.project.findMany({
    where: { ...publicProjectWhere(year), topicId },
    orderBy: PUBLIC_PROJECT_ORDER,
    select: publicProjectSelect(year),
    skip: (page - 1) * PUBLIC_PROJECTS_PAGE_SIZE,
    take: PUBLIC_PROJECTS_PAGE_SIZE + 1,
  });

  return {
    items: rows.slice(0, PUBLIC_PROJECTS_PAGE_SIZE).map(toPublicProject),
    page,
    hasMore: rows.length > PUBLIC_PROJECTS_PAGE_SIZE,
  };
}
