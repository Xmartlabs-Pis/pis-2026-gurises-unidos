import bcrypt from 'bcryptjs';
import { PrismaClient, type UserTokenType } from '../src/generated/prisma/client';
import { E2E_DB_RESULT_MARKER, e2eDatabaseUrl } from './e2e-database-url';

process.env.DATABASE_URL = e2eDatabaseUrl();

const prisma = new PrismaClient();

async function createActiveUser(documentId: string) {
  const password = process.env.SEED_USER_PASSWORD;
  if (!password) {
    throw new Error('SEED_USER_PASSWORD environment variable is required');
  }
  const user = await prisma.user.create({
    data: {
      firstName: 'E2E',
      lastName: 'Temporary',
      documentId,
      email: `e2e-${documentId}@gurisesunidos.test`,
      role: 'coordinator',
      status: 'active',
      passwordHash: await bcrypt.hash(password, 10),
    },
  });
  return { email: user.email };
}

async function hasActiveUserToken(documentId: string, type: UserTokenType) {
  const count = await prisma.userToken.count({
    where: {
      type,
      user: { documentId },
      usedAt: null,
      revokedAt: null,
      expiresAt: { gt: new Date() },
    },
  });
  return count > 0;
}

async function issueUserToken(documentId: string, type: UserTokenType) {
  const { createUserToken } = await import('../src/lib/auth/user-tokens');
  const user = await prisma.user.findUniqueOrThrow({ where: { documentId } });
  const token = await prisma.$transaction((tx) => createUserToken(tx, user.id, type));
  return { token, status: user.status };
}

async function deleteUsers(documentIds: string[]) {
  const users = await prisma.user.findMany({
    where: { documentId: { in: documentIds } },
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

async function deleteProjects(names: string[]) {
  const projects = await prisma.project.findMany({
    where: { name: { in: names } },
    select: { id: true, projectBeneficiaries: { select: { id: true } } },
  });
  const ids = projects.map((project) => project.id);
  const beneficiaryIds = projects.flatMap((project) =>
    project.projectBeneficiaries.map((beneficiary) => beneficiary.id)
  );
  await prisma.$transaction([
    prisma.auditLog.deleteMany({
      where: {
        OR: [
          { entity: 'project', entityId: { in: ids } },
          { entity: 'beneficiary', entityId: { in: beneficiaryIds } },
        ],
      },
    }),
    prisma.projectBeneficiary.deleteMany({ where: { id: { in: beneficiaryIds } } }),
    prisma.projectCoordinator.deleteMany({ where: { projectId: { in: ids } } }),
    prisma.project.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

async function deleteBeneficiaryCategories(names: string[]) {
  const categories = await prisma.beneficiaryCategory.findMany({
    where: { name: { in: names }, isSystem: false },
    select: { id: true },
  });
  const ids = categories.map((category) => category.id);
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { entity: 'beneficiaryCategory', entityId: { in: ids } } }),
    prisma.projectBeneficiaryValue.deleteMany({ where: { categoryId: { in: ids } } }),
    prisma.beneficiaryCategory.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

async function lastAuditLogId() {
  const last = await prisma.auditLog.findFirst({ orderBy: { id: 'desc' }, select: { id: true } });
  return last?.id ?? 0;
}

async function resetMetricSettings(afterAuditLogId: number) {
  await prisma.$transaction([
    prisma.auditLog.deleteMany({
      where: { id: { gt: afterAuditLogId }, entity: { in: ['metric', 'topic'] } },
    }),
    prisma.metric.deleteMany(),
    prisma.publicSettings.deleteMany(),
  ]);
}

const COMMANDS = {
  createActiveUser,
  hasActiveUserToken,
  issueUserToken,
  deleteUsers,
  deleteProjects,
  deleteBeneficiaryCategories,
  lastAuditLogId,
  resetMetricSettings,
} as const;

export type E2eDbCommands = typeof COMMANDS;

async function main() {
  const [command, ...args] = JSON.parse(process.env.E2E_DB_COMMAND!) as [
    keyof typeof COMMANDS,
    ...unknown[],
  ];
  const run = COMMANDS[command] as (...input: unknown[]) => Promise<unknown>;
  console.log(E2E_DB_RESULT_MARKER + JSON.stringify((await run(...args)) ?? null));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
