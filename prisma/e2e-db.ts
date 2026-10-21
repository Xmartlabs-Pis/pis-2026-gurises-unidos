import bcrypt from 'bcryptjs';
import { PrismaClient, type UserTokenType } from '../src/generated/prisma/client';
import { createUserToken } from '../src/lib/auth/user-tokens';
import { e2eDatabaseUrl } from './e2e-database-url';

const prisma = new PrismaClient({ datasourceUrl: e2eDatabaseUrl() });

async function createActiveUser(documentId: string) {
  const user = await prisma.user.create({
    data: {
      firstName: 'E2E',
      lastName: 'Temporary',
      documentId,
      email: `e2e-${documentId}@gurisesunidos.test`,
      role: 'coordinator',
      status: 'active',
      passwordHash: await bcrypt.hash(process.env.SEED_USER_PASSWORD!, 10),
    },
  });
  return { email: user.email };
}

async function issueUserToken(documentId: string, type: UserTokenType) {
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

async function resetMetricSettings() {
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { entity: 'metric' } }),
    prisma.metric.deleteMany(),
    prisma.publicSettings.deleteMany(),
  ]);
}

const COMMANDS = {
  createActiveUser,
  issueUserToken,
  deleteUsers,
  deleteProjects,
  deleteBeneficiaryCategories,
  resetMetricSettings,
} as const;

async function main() {
  const [command, ...args] = JSON.parse(process.env.E2E_DB_COMMAND!) as [
    keyof typeof COMMANDS,
    ...unknown[],
  ];
  const run = COMMANDS[command] as (...input: unknown[]) => Promise<unknown>;
  console.log(JSON.stringify((await run(...args)) ?? null));
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
