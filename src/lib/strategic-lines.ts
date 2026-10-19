import prisma from '@/lib/prisma';

export async function getStrategicLines() {
  return prisma.strategicLine.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      _count: { select: { projects: { where: { deletedAt: null } } } },
    },
  });
}
