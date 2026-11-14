import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { PrismaClient } from '../src/generated/prisma/client';
import { logAudit } from '../src/lib/audit-log';
import { passwordSchema } from '../src/lib/validation/password';
import { ADMIN as admin, BENEFICIARY_CATEGORIES } from './fixtures';

const prisma = new PrismaClient();

function readPassword() {
  const result = passwordSchema.safeParse(process.env.SEED_USER_PASSWORD ?? '');
  if (!result.success) {
    throw new Error(`Invalid SEED_USER_PASSWORD: ${z.prettifyError(result.error)}`);
  }
  return result.data;
}

async function main() {
  const password = readPassword();
  const passwordHash = await bcrypt.hash(password, 10);

  const outcome = await prisma.$transaction(async (tx) => {
    await tx.beneficiaryCategory.createMany({
      data: BENEFICIARY_CATEGORIES,
      skipDuplicates: true,
    });

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
      return 'existing';
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
    return 'created';
  });

  console.log(
    outcome === 'created'
      ? 'Main seed completed: admin created'
      : 'Main seed completed: admin already existed, left untouched'
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
