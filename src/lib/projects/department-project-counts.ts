import prisma from '@/lib/prisma';

export type DepartmentProjectCounts = {
  department: string;
  total: number;
  active: number;
};

export async function getDepartmentProjectCounts(): Promise<DepartmentProjectCounts[]> {
  const [totals, actives] = await Promise.all([
    prisma.department.findMany({
      select: {
        id: true,
        name: true,
        _count: { select: { projects: { where: { deletedAt: null } } } },
      },
    }),
    prisma.department.findMany({
      select: {
        id: true,
        _count: { select: { projects: { where: { deletedAt: null, status: 'active' } } } },
      },
    }),
  ]);

  const activeById = new Map(actives.map(({ id, _count }) => [id, _count.projects]));

  return totals
    .map(({ id, name, _count }) => ({
      department: name,
      total: _count.projects,
      active: activeById.get(id) ?? 0,
    }))
    .sort((a, b) => b.total - a.total || a.department.localeCompare(b.department));
}
