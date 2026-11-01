import prisma from '@/lib/prisma';

export function getContributors() {
  return prisma.contributor.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
}

export type Contributor = Awaited<ReturnType<typeof getContributors>>[number];
