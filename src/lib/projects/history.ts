import prisma from '@/lib/prisma';

async function getBeneficiaryIds(projectId: number) {
  const beneficiaries = await prisma.projectBeneficiary.findMany({
    where: { projectId },
    select: { id: true },
  });
  return beneficiaries.map(({ id }) => id);
}

export async function getProjectHistory(projectId: number, beneficiaryIds?: number[]) {
  const ids = beneficiaryIds ?? (await getBeneficiaryIds(projectId));

  return prisma.auditLog.findMany({
    where: {
      OR: [
        { entity: 'project', entityId: projectId },
        { entity: 'beneficiary', entityId: { in: ids } },
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
