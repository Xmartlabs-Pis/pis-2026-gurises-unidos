import prisma from '@/lib/prisma';

const SORT_ORDER = [{ sortOrder: 'asc' }, { id: 'asc' }] as const;

export function getPublicPartners() {
  return prisma.partner.findMany({
    where: { isActive: true, showPublicly: true },
    select: { id: true, name: true },
    orderBy: [...SORT_ORDER],
  });
}

export function getMetricsPartners() {
  return prisma.partner.findMany({
    where: { isActive: true },
    select: { id: true, name: true, showPublicly: true },
    orderBy: [...SORT_ORDER],
  });
}

export function getManagedPartners() {
  return prisma.partner.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      counterpartyType: true,
      _count: { select: { projects: { where: { deletedAt: null } } } },
    },
  });
}

export type PublicPartner = Awaited<ReturnType<typeof getPublicPartners>>[number];
export type MetricsPartner = Awaited<ReturnType<typeof getMetricsPartners>>[number];
