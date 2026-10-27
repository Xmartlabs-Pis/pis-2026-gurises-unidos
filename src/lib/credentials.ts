import type { LoginThrottle, User } from '@/generated/prisma/client';
import bcrypt from 'bcryptjs';
import prisma from './prisma';
import { normalizeDocumentId } from './utils';
import { getAvatarColorIndex } from './users/avatar';
import { LoginCooldownError } from './auth/login-cooldown-error';

const DUMMY_PASSWORD_HASH = '$2b$10$qYzMcJ.E4lnDm6ffrfnKjuksp7QvpqWK1L476sVjmNEqsJyQMuz.O';
const FREE_LOGIN_ATTEMPTS = 5;
const LOGIN_COOLDOWN_MS = 5 * 60 * 1000;

export async function verifyUserCredentials(
  documentId: string,
  password: string
): Promise<User | null> {
  const normalizedDocumentId = normalizeDocumentId(documentId);
  const result = await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`
        INSERT INTO "LoginThrottle" ("documentId")
        VALUES (${normalizedDocumentId})
        ON CONFLICT ("documentId") DO NOTHING
      `;
      const [throttle] = await tx.$queryRaw<LoginThrottle[]>`
        SELECT * FROM "LoginThrottle"
        WHERE "documentId" = ${normalizedDocumentId}
        FOR UPDATE
      `;

      if (throttle.blockedUntil && throttle.blockedUntil.getTime() > Date.now()) {
        return { user: null, blockedUntil: throttle.blockedUntil };
      }

      const user = await tx.user.findUnique({
        where: { documentId: normalizedDocumentId },
      });
      const canSignIn = user && !user.deletedAt && user.status === 'active';
      const isPasswordValid = await bcrypt.compare(
        password,
        canSignIn ? user.passwordHash : DUMMY_PASSWORD_HASH
      );

      if (canSignIn && isPasswordValid) {
        await tx.loginThrottle.update({
          where: { documentId: normalizedDocumentId },
          data: { failedAttempts: 0, blockedUntil: null },
        });
        return { user, blockedUntil: null };
      }

      const failedAttempts = Math.min(throttle.failedAttempts + 1, FREE_LOGIN_ATTEMPTS);
      const blockedUntil =
        failedAttempts >= FREE_LOGIN_ATTEMPTS ? new Date(Date.now() + LOGIN_COOLDOWN_MS) : null;

      await tx.loginThrottle.update({
        where: { documentId: normalizedDocumentId },
        data: { failedAttempts, blockedUntil },
      });
      return { user: null, blockedUntil };
    },
    { maxWait: 10_000, timeout: 15_000 }
  );

  if (result.blockedUntil) {
    throw new LoginCooldownError(result.blockedUntil);
  }

  return result.user;
}

export function toAuthUser(user: User) {
  return {
    id: String(user.id),
    email: user.email,
    name: `${user.firstName} ${user.lastName}`,
    role: user.role,
    avatarColorIndex: getAvatarColorIndex(user.documentId),
    mustChangePassword: user.mustChangePassword,
  };
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(password, passwordHash);
}
