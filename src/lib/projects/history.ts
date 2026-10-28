import prisma from '@/lib/prisma';

export async function getProjectHistory(projectId: number) {
  const beneficiaries = await prisma.projectBeneficiary.findMany({
    where: { projectId },
    select: { id: true },
  });

  return prisma.auditLog.findMany({
    where: {
      OR: [
        { entity: 'project', entityId: projectId },
        { entity: 'beneficiary', entityId: { in: beneficiaries.map(({ id }) => id) } },
      ],
    },
    orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
    select: {
      id: true,
      action: true,
      entity: true,
      details: true,
      occurredAt: true,
      author: { select: { firstName: true, lastName: true } },
    },
  });
}
