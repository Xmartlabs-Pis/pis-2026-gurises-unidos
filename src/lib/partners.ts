import prisma from '@/lib/prisma';

export function getPartners() {
  return prisma.partner.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
  });
}

export type Partner = Awaited<ReturnType<typeof getPartners>>[number];
