import prisma from '@/lib/prisma';

export async function getTopics() {
  return prisma.topic.findMany({
    where: {
      isActive: true,
    },
    orderBy: {
      name: 'asc',
    },
    select: {
      id: true,
      name: true,
      _count: {
        select: {
          projects: {
            where: { deletedAt: null },
          },
        },
      },
    },
  });
}
