import prisma from '@/lib/prisma';

export function getTopicMetricKey(topicId: number) {
  return `topic_projects_${topicId}`;
}

export async function getTopicStatistics(year: number) {
  const [topics, settings] = await Promise.all([
    prisma.topic.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            projects: {
              where: {
                deletedAt: null,
                showOnLanding: true,
                projectBeneficiaries: { some: { year } },
              },
            },
          },
        },
      },
    }),
    prisma.metric.findMany({
      where: { key: { startsWith: 'topic_projects_' } },
      select: { key: true, showPublicly: true },
    }),
  ]);

  const visibility = new Map(settings.map(({ key, showPublicly }) => [key, showPublicly]));
  return topics.map(({ id, name, _count }) => ({
    id,
    name,
    projectCount: _count.projects,
    showPublicly: visibility.get(getTopicMetricKey(id)) ?? false,
  }));
}

export type TopicStatistic = Awaited<ReturnType<typeof getTopicStatistics>>[number];
