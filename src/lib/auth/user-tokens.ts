import { createHash, randomBytes } from 'node:crypto';
import type { Prisma, User, UserTokenType } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';

export const PASSWORD_RESET_TOKEN_TTL_MINUTES = 60;

const TOKEN_TTL_MINUTES: Record<UserTokenType, number> = {
  passwordReset: PASSWORD_RESET_TOKEN_TTL_MINUTES,
};

export type UserTokenFailureReason = 'invalid' | 'expired' | 'used' | 'replaced';

export type UserTokenLookup =
  { valid: true; tokenId: number; user: User } | { valid: false; reason: UserTokenFailureReason };

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function createUserToken(
  tx: Prisma.TransactionClient,
  userId: number,
  type: UserTokenType
) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;

  const now = new Date();

  await tx.userToken.updateMany({
    where: { userId, type, usedAt: null, revokedAt: null },
    data: { revokedAt: now },
  });

  const token = randomBytes(32).toString('base64url');

  await tx.userToken.create({
    data: {
      userId,
      type,
      tokenHash: hashToken(token),
      expiresAt: new Date(now.getTime() + TOKEN_TTL_MINUTES[type] * 60 * 1000),
    },
  });

  return token;
}

export async function findValidUserToken(
  token: string,
  type: UserTokenType
): Promise<UserTokenLookup> {
  const userToken = await prisma.userToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!userToken || userToken.type !== type || userToken.user.deletedAt) {
    return { valid: false, reason: 'invalid' };
  }

  if (userToken.usedAt) {
    return { valid: false, reason: 'used' };
  }

  if (userToken.revokedAt) {
    return { valid: false, reason: 'replaced' };
  }

  if (userToken.expiresAt <= new Date()) {
    return { valid: false, reason: 'expired' };
  }

  return { valid: true, tokenId: userToken.id, user: userToken.user };
}

export async function consumeUserToken(tx: Prisma.TransactionClient, tokenId: number) {
  const { count } = await tx.userToken.updateMany({
    where: { id: tokenId, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  return count === 1;
}
