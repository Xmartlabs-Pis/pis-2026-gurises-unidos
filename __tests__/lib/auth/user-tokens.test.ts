import { createHash } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { Prisma } from '@/generated/prisma/client';
import { makeUser } from '../../fixtures/user';

const { findUniqueMock } = vi.hoisted(() => ({ findUniqueMock: vi.fn() }));

vi.mock('@/lib/prisma', () => ({
  default: { userToken: { findUnique: findUniqueMock } },
}));

import {
  consumeUserToken,
  createUserToken,
  findValidUserToken,
  hashToken,
  PASSWORD_RESET_TOKEN_TTL_MINUTES,
} from '@/lib/auth/user-tokens';

const NOW = new Date('2026-10-14T12:00:00Z');

function makeTx() {
  const tx = {
    $queryRaw: vi.fn().mockResolvedValue([]),
    userToken: {
      updateMany: vi.fn().mockResolvedValue({ count: 0 }),
      create: vi.fn().mockResolvedValue({}),
    },
  };
  return { tx, client: tx as unknown as Prisma.TransactionClient };
}

function makeStoredToken(overrides: Record<string, unknown> = {}) {
  return {
    id: 5,
    userId: 7,
    type: 'passwordReset',
    tokenHash: hashToken('raw-token'),
    expiresAt: new Date(NOW.getTime() + 60_000),
    usedAt: null,
    revokedAt: null,
    createdAt: NOW,
    user: makeUser({ id: 7 }),
    ...overrides,
  };
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  findUniqueMock.mockReset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('hashToken', () => {
  test('returns the SHA-256 hex digest of the token', () => {
    expect(hashToken('raw-token')).toBe(createHash('sha256').update('raw-token').digest('hex'));
  });
});

describe('createUserToken', () => {
  test('locks the user row before revoking the previous tokens', async () => {
    const { tx, client } = makeTx();

    await createUserToken(client, 7, 'passwordReset');

    expect(tx.$queryRaw).toHaveBeenCalledWith(expect.anything(), 7);
    expect(tx.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(
      tx.userToken.updateMany.mock.invocationCallOrder[0]
    );
  });

  test('revokes the pending tokens of the same user and type', async () => {
    const { tx, client } = makeTx();

    await createUserToken(client, 7, 'passwordReset');

    expect(tx.userToken.updateMany).toHaveBeenCalledWith({
      where: { userId: 7, type: 'passwordReset', usedAt: null, revokedAt: null },
      data: { revokedAt: NOW },
    });
  });

  test('stores only the hash of the token with the type expiration', async () => {
    const { tx, client } = makeTx();

    const token = await createUserToken(client, 7, 'passwordReset');

    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(tx.userToken.create).toHaveBeenCalledWith({
      data: {
        userId: 7,
        type: 'passwordReset',
        tokenHash: hashToken(token),
        expiresAt: new Date(NOW.getTime() + PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000),
      },
    });
  });

  test('generates a different token on every call', async () => {
    const { client } = makeTx();

    const first = await createUserToken(client, 7, 'passwordReset');
    const second = await createUserToken(client, 7, 'passwordReset');

    expect(first).not.toBe(second);
  });
});

describe('findValidUserToken', () => {
  test('looks the token up by its hash', async () => {
    findUniqueMock.mockResolvedValue(makeStoredToken());

    await findValidUserToken('raw-token', 'passwordReset');

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { tokenHash: hashToken('raw-token') },
      include: { user: true },
    });
  });

  test('returns the token and user when it is valid', async () => {
    const stored = makeStoredToken();
    findUniqueMock.mockResolvedValue(stored);

    const result = await findValidUserToken('raw-token', 'passwordReset');

    expect(result).toEqual({ valid: true, tokenId: 5, user: stored.user });
  });

  test('returns invalid when the token does not exist', async () => {
    findUniqueMock.mockResolvedValue(null);

    const result = await findValidUserToken('unknown', 'passwordReset');

    expect(result).toEqual({ valid: false, reason: 'invalid' });
  });

  test('returns invalid when the user was deleted', async () => {
    findUniqueMock.mockResolvedValue(
      makeStoredToken({ user: makeUser({ id: 7, deletedAt: new Date('2026-10-01') }) })
    );

    const result = await findValidUserToken('raw-token', 'passwordReset');

    expect(result).toEqual({ valid: false, reason: 'invalid' });
  });

  test('returns used when the token was already used', async () => {
    findUniqueMock.mockResolvedValue(makeStoredToken({ usedAt: NOW }));

    const result = await findValidUserToken('raw-token', 'passwordReset');

    expect(result).toEqual({ valid: false, reason: 'used' });
  });

  test('returns replaced when a newer token revoked it', async () => {
    findUniqueMock.mockResolvedValue(makeStoredToken({ revokedAt: NOW }));

    const result = await findValidUserToken('raw-token', 'passwordReset');

    expect(result).toEqual({ valid: false, reason: 'replaced' });
  });

  test('returns expired when the expiration date has passed', async () => {
    findUniqueMock.mockResolvedValue(makeStoredToken({ expiresAt: NOW }));

    const result = await findValidUserToken('raw-token', 'passwordReset');

    expect(result).toEqual({ valid: false, reason: 'expired' });
  });
});

describe('consumeUserToken', () => {
  test('marks the token as used only if it is still pending and not expired', async () => {
    const { tx, client } = makeTx();
    tx.userToken.updateMany.mockResolvedValue({ count: 1 });

    const consumed = await consumeUserToken(client, 5);

    expect(consumed).toBe(true);
    expect(tx.userToken.updateMany).toHaveBeenCalledWith({
      where: { id: 5, usedAt: null, revokedAt: null, expiresAt: { gt: NOW } },
      data: { usedAt: NOW },
    });
  });

  test('returns false when no pending token matched', async () => {
    const { tx, client } = makeTx();
    tx.userToken.updateMany.mockResolvedValue({ count: 0 });

    const consumed = await consumeUserToken(client, 5);

    expect(consumed).toBe(false);
  });
});
