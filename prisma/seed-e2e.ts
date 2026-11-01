import { execSync } from 'node:child_process';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '../src/generated/prisma/client';
import { BENEFICIARY_CATEGORIES, STRATEGIC_LINES, TABLES } from './fixtures';
import { toBeneficiaryValuesCreate } from '../src/lib/project-display';
import {
  E2E_ACTIVE_PROJECT,
  E2E_ADMIN,
  E2E_BENEFICIARY_YEAR,
  E2E_INACTIVE_PROJECT,
  E2E_COORDINATOR,
  E2E_DEPARTMENT,
  E2E_DISABLED_COORDINATOR,
  E2E_SECONDARY_DEPARTMENT,
  E2E_TOPICS,
} from './e2e-fixtures';
import { e2eDatabaseUrl } from './e2e-database-url';

async function main() {
  const url = e2eDatabaseUrl();

  const seedPassword = process.env.SEED_USER_PASSWORD;
  if (!seedPassword) {
    throw new Error('SEED_USER_PASSWORD environment variable is required');
  }

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: url },
  });

  const passwordHash = await bcrypt.hash(seedPassword, 10);
  const prisma = new PrismaClient({ datasourceUrl: url });

  try {
    await prisma.$transaction(
      async (tx) => {
        const tables = TABLES.map((table) => `"${table}"`).join(',');
        await tx.$executeRawUnsafe(`TRUNCATE TABLE ${tables} RESTART IDENTITY CASCADE`);
        await tx.beneficiaryCategory.createMany({ data: BENEFICIARY_CATEGORIES });
        await tx.strategicLine.createMany({ data: STRATEGIC_LINES.map((name) => ({ name })) });

        const department = await tx.department.create({ data: { name: E2E_DEPARTMENT } });
        await tx.department.create({ data: { name: E2E_SECONDARY_DEPARTMENT } });
        await tx.topic.createMany({ data: E2E_TOPICS.map((name) => ({ name })) });

        const topic = await tx.topic.findUniqueOrThrow({ where: { name: E2E_TOPICS[0] } });

        const admin = await tx.user.create({ data: { ...E2E_ADMIN, passwordHash } });
        const coordinator = await tx.user.create({
          data: { ...E2E_COORDINATOR, passwordHash, createdBy: admin.id },
        });
        await tx.user.create({
          data: { ...E2E_DISABLED_COORDINATOR, passwordHash, createdBy: admin.id },
        });

        const activeProject = await tx.project.create({
          data: {
            ...E2E_ACTIVE_PROJECT,
            leadCoordinatorId: coordinator.id,
            departments: { connect: { id: department.id } },
            topics: { connect: { id: topic.id } },
            createdBy: admin.id,
          },
        });

        await tx.project.create({
          data: {
            ...E2E_INACTIVE_PROJECT,
            leadCoordinatorId: coordinator.id,
            departments: { connect: { id: department.id } },
            topics: { connect: { id: topic.id } },
            createdBy: admin.id,
          },
        });

        await tx.projectBeneficiary.create({
          data: {
            projectId: activeProject.id,
            year: E2E_BENEFICIARY_YEAR,
            authorId: coordinator.id,
            values: {
              create: toBeneficiaryValuesCreate({ directChildrenAdolescents: 50, families: 20 }),
            },
          },
        });
      },
      { maxWait: 10_000, timeout: 30_000 }
    );
  } finally {
    await prisma.$disconnect();
  }

  console.log('E2E seed completed');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
