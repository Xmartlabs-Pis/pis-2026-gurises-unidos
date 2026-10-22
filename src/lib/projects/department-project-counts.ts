import prisma from '@/lib/prisma';

export type DepartmentProjectCounts = {
  department: string;
  total: number;
  active: number;
};

export async function getDepartmentProjectCounts(): Promise<DepartmentProjectCounts[]> {
  const departments = await prisma.department.findMany({
    select: {
      name: true,
      _count: { select: { projects: { where: { deletedAt: null } } } },
      projects: { where: { deletedAt: null, status: 'active' }, select: { id: true } },
    },
  });

  return departments
    .map(({ name, _count, projects }) => ({
      department: name,
      total: _count.projects,
      active: projects.length,
    }))
    .sort((a, b) => b.total - a.total || a.department.localeCompare(b.department));
}
