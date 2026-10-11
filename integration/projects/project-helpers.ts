import type { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';
import { BENEFICIARY_VALUES_SELECT, toBeneficiaryCounts } from '@/lib/projects/beneficiary-values';

async function auditLogFilterFor(id: number): Promise<Prisma.AuditLogWhereInput> {
  const beneficiaryIds = (
    await prisma.projectBeneficiary.findMany({ where: { projectId: id }, select: { id: true } })
  ).map((beneficiary) => beneficiary.id);
  return {
    OR: [
      { entity: 'project', entityId: id },
      { entity: 'beneficiary', entityId: { in: beneficiaryIds } },
    ],
  };
}

export async function deleteProject(id: number) {
  const auditLogFilter = await auditLogFilterFor(id);
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: auditLogFilter }),
    prisma.projectBeneficiary.deleteMany({ where: { projectId: id } }),
    prisma.project.deleteMany({ where: { id } }),
  ]);
}

export async function loadProject(id: number) {
  const project = await prisma.project.findUniqueOrThrow({
    where: { id },
    include: {
      strategicLines: { select: { id: true } },
      projectBeneficiaries: {
        orderBy: { year: 'asc' },
        include: BENEFICIARY_VALUES_SELECT,
      },
    },
  });
  return {
    ...project,
    projectBeneficiaries: project.projectBeneficiaries.map(({ values, ...beneficiary }) => ({
      ...beneficiary,
      ...toBeneficiaryCounts(values),
    })),
  };
}

export async function auditLogsFor(id: number) {
  return prisma.auditLog.findMany({
    where: await auditLogFilterFor(id),
    orderBy: { id: 'asc' },
  });
}
