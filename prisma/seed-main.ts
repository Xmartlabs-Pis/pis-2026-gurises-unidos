import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { Prisma, PrismaClient } from '../src/generated/prisma/client';
import { logAudit } from '../src/lib/audit-log';
import { passwordSchema } from '../src/lib/validation/password';
import {
  ADMIN as admin,
  BENEFICIARY_CATEGORIES,
  PARTNERS,
  STRATEGIC_LINES,
  TOPICS,
} from './fixtures';

const prisma = new PrismaClient();

function readPassword() {
  const result = passwordSchema.safeParse(process.env.SEED_USER_PASSWORD ?? '');
  if (!result.success) {
    throw new Error(`Invalid SEED_USER_PASSWORD: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

async function createIfEmpty(
  existingCount: Promise<number>,
  create: () => Promise<{ count: number }>
) {
  return (await existingCount) === 0 ? (await create()).count : 0;
}

async function ensureAdmin(tx: Prisma.TransactionClient, passwordHash: string) {
  const existing = await tx.user.findMany({
    where: { OR: [{ documentId: admin.documentId }, { email: admin.email }] },
    select: { documentId: true, email: true, role: true, status: true, deletedAt: true },
  });
  if (existing.length > 0) {
    const [user] = existing;
    const isSameActiveAdmin =
      existing.length === 1 &&
      user.documentId === admin.documentId &&
      user.email === admin.email &&
      user.role === 'admin' &&
      user.status === 'active' &&
      user.deletedAt === null;
    if (!isSameActiveAdmin) {
      throw new Error('A user with that document or email exists but is not the active admin');
    }
    return false;
  }

  const created = await tx.user.create({
    data: {
      ...admin,
      passwordHash,
      passwordChangedAt: new Date(),
      mustChangePassword: true,
    },
  });
  await logAudit(tx, {
    authorId: created.id,
    action: 'creation',
    entity: 'user',
    entityId: created.id,
  });
  return true;
}

async function main() {
  const password = readPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const summary = await prisma.$transaction(
    async (tx) => {
      await tx.beneficiaryCategory.createMany({
        data: BENEFICIARY_CATEGORIES,
        skipDuplicates: true,
      });

      const topics = await createIfEmpty(tx.topic.count(), () =>
        tx.topic.createMany({ data: TOPICS.map((name) => ({ name })) })
      );

      const strategicLines = await createIfEmpty(tx.strategicLine.count(), () =>
        tx.strategicLine.createMany({ data: STRATEGIC_LINES.map((name) => ({ name })) })
      );

      const partners = await createIfEmpty(tx.partner.count(), () =>
        tx.partner.createMany({
          data: PARTNERS.map((partner, index) => ({
            ...partner,
            showPublicly: true,
            sortOrder: index + 1,
          })),
        })
      );

      const adminCreated = await ensureAdmin(tx, passwordHash);

      return {
        admin: adminCreated ? 'created' : 'already existed, left untouched',
        topics,
        strategicLines,
        partners,
      };
    },
    { maxWait: 20_000, timeout: 120_000 }
  );

  console.log(
    `Main seed completed. Admin ${summary.admin}. Created ${summary.topics} topics, ` +
      `${summary.strategicLines} strategic lines and ${summary.partners} partners.`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
