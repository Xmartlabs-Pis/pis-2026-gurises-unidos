import prisma from '@/lib/prisma';

export async function getTopicStatistics(year: number) {
  const topics = await prisma.topic.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      showPublicly: true,
      _count: {
        select: {
          projects: {
            where: { deletedAt: null, projectBeneficiaries: { some: { year } } },
          },
        },
      },
    },
  });
  return topics.map(({ id, name, showPublicly, _count }) => ({
    id,
    name,
    projectCount: _count.projects,
    showPublicly,
  }));
}

export type TopicStatistic = Awaited<ReturnType<typeof getTopicStatistics>>[number];
