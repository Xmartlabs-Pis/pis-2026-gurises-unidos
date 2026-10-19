import type { User } from '@/generated/prisma/client';
import { hashPassword } from '@/lib/credentials';
import prisma from '@/lib/prisma';

export const TEST_USER_PASSWORD = 'TestPassword1';

export async function createTestUser(documentId: string, overrides: Partial<User> = {}) {
  return prisma.user.create({
    data: {
      firstName: 'Integration',
      lastName: 'User',
      documentId,
      email: `integration-${documentId}@gurisesunidos.test`,
      role: 'coordinator',
      status: 'active',
      passwordHash: await hashPassword(TEST_USER_PASSWORD),
      ...overrides,
    },
  });
}

export function userAuditLogsFor(id: number) {
  return prisma.auditLog.findMany({
    where: { entity: 'user', entityId: id },
    orderBy: { id: 'asc' },
  });
}

export async function deleteTestUsers(documentIds: readonly string[]) {
  const users = await prisma.user.findMany({
    where: { documentId: { in: [...documentIds] } },
    select: { id: true },
  });
  const ids = users.map((user) => user.id);
  await prisma.$transaction([
    prisma.auditLog.deleteMany({
      where: { OR: [{ entity: 'user', entityId: { in: ids } }, { authorId: { in: ids } }] },
    }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
}
