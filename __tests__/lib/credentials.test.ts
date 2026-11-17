import bcrypt from 'bcryptjs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { makeUser, TEST_PASSWORD, TEST_PASSWORD_HASH } from '../fixtures/user';
import { hashPassword, toAuthUser, verifyPassword, verifyUserCredentials } from '@/lib/credentials';
import prisma from '@/lib/prisma';
import { prismaMock } from '../mocks/prisma';
import { LoginCooldownError } from '@/lib/auth/login-cooldown-error';

describe('toAuthUser', () => {
  test.each([
    { id: 1, role: 'admin' as const },
    { id: 42, role: 'coordinator' as const },
  ])('maps id $id, email, name, and role $role', ({ id, role }) => {
    const user = makeUser({ id, role, firstName: 'Ana', lastName: 'Admin' });

    expect(toAuthUser(user)).toEqual({
      id: String(id),
      email: user.email,
      name: 'Ana Admin',
      role,
      avatarColorIndex: Number(user.documentId.at(-1)),
      mustChangePassword: false,
    });
  });
});

describe('verifyUserCredentials', () => {
  let compare: MockInstance<typeof bcrypt.compare>;
  const transaction = {
    user: prismaMock.user,
    $executeRaw: vi.fn(),
    $queryRaw: vi.fn(),
    loginThrottle: { update: vi.fn() },
    auditLog: { create: vi.fn() },
  };

  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    transaction.$executeRaw.mockReset();
    transaction.$queryRaw
      .mockReset()
      .mockResolvedValue([{ failedAttempts: 0, blockedUntil: null }]);
    transaction.loginThrottle.update.mockReset();
    transaction.auditLog.create.mockReset();
    prismaMock.$transaction.mockImplementation(async (callback) => callback(transaction));
    compare = vi.spyOn(bcrypt, 'compare');
  });

  afterEach(() => {
    compare.mockRestore();
    vi.useRealTimers();
  });

  function dummyHashFromCompare() {
    expect(compare).toHaveBeenCalledOnce();
    const [password, hash] = compare.mock.calls[0];
    expect(typeof hash).toBe('string');
    return { password, hash: hash as string };
  }

  async function captureDummyHash(password: string) {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    await verifyUserCredentials('missing', password);
    const captured = dummyHashFromCompare();
    expect(captured.password).toBe(password);
    return captured.hash;
  }

  function expectDummyCompare(password: string, dummyHash: string, realPasswordHash?: string) {
    expect(compare).toHaveBeenCalledOnce();
    expect(compare).toHaveBeenCalledWith(password, dummyHash);
    if (realPasswordHash) {
      expect(dummyHash).not.toBe(realPasswordHash);
    }
  }

  test('looks up the user by the normalized document id', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await verifyUserCredentials('4.123.456-7', TEST_PASSWORD);

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { documentId: '41234567' },
    });
  });

  test('returns the user when status is active and the password matches', async () => {
    const user = makeUser();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user);

    await expect(verifyUserCredentials(user.documentId, TEST_PASSWORD)).resolves.toEqual(user);
    expect(compare).toHaveBeenCalledOnce();
    expect(compare).toHaveBeenCalledWith(TEST_PASSWORD, user.passwordHash);
    expect(transaction.auditLog.create).not.toHaveBeenCalled();
  });

  test('returns null and compares against a dummy hash when the user is missing', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(verifyUserCredentials('41234567', TEST_PASSWORD)).resolves.toBeNull();
    const { password, hash } = dummyHashFromCompare();
    expect(password).toBe(TEST_PASSWORD);
    expect(hash).toMatch(/^\$2[aby]\$/);
  });

  test('returns null and compares against the dummy hash when deletedAt is set', async () => {
    const dummyHash = await captureDummyHash(TEST_PASSWORD);
    const user = makeUser({ deletedAt: new Date('2026-02-01T00:00:00.000Z') });

    compare.mockClear();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user);

    await expect(verifyUserCredentials(user.documentId, TEST_PASSWORD)).resolves.toBeNull();
    expectDummyCompare(TEST_PASSWORD, dummyHash, user.passwordHash);
  });

  test.each(['pendingInvitation', 'disabled'] as const)(
    'returns null and compares against the dummy hash when status is %s',
    async (status) => {
      const dummyHash = await captureDummyHash(TEST_PASSWORD);
      const user = makeUser({ status });

      compare.mockClear();
      vi.mocked(prisma.user.findUnique).mockResolvedValue(user);

      await expect(verifyUserCredentials(user.documentId, TEST_PASSWORD)).resolves.toBeNull();
      expectDummyCompare(TEST_PASSWORD, dummyHash, user.passwordHash);
    }
  );

  test('returns null when the password does not match', async () => {
    const user = makeUser();
    vi.mocked(prisma.user.findUnique).mockResolvedValue(user);

    await expect(verifyUserCredentials(user.documentId, 'wrong')).resolves.toBeNull();
    expect(compare).toHaveBeenCalledOnce();
    expect(compare).toHaveBeenCalledWith('wrong', user.passwordHash);
  });

  test('propagates findUnique failures', async () => {
    vi.mocked(prisma.user.findUnique).mockRejectedValue(new Error('db down'));

    await expect(verifyUserCredentials('41234567', TEST_PASSWORD)).rejects.toThrow('db down');
    expect(compare).not.toHaveBeenCalled();
  });

  test('rejects a blocked attempt without checking the password or changing the deadline', async () => {
    const blockedUntil = new Date(Date.now() + 300_000);
    transaction.$queryRaw.mockResolvedValue([{ failedAttempts: 5, blockedUntil }]);

    await expect(verifyUserCredentials('11111111', TEST_PASSWORD)).rejects.toMatchObject({
      nextAllowedAt: blockedUntil,
    });

    expect(prisma.user.findUnique).not.toHaveBeenCalled();
    expect(compare).not.toHaveBeenCalled();
    expect(transaction.loginThrottle.update).not.toHaveBeenCalled();
    expect(transaction.auditLog.create).toHaveBeenCalledExactlyOnceWith({
      data: {
        action: 'loginFailure',
        entity: 'authentication',
        details: { documentId: '11111111', reason: 'blocked' },
      },
    });
  });

  test('throws the cooldown error only after committing the fifth failure', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-26T15:00:00.000Z'));
    transaction.$queryRaw.mockResolvedValue([{ failedAttempts: 4, blockedUntil: null }]);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    let committed = false;
    prismaMock.$transaction.mockImplementation(async (callback) => {
      const result = await callback(transaction);
      committed = true;
      return result;
    });

    await expect(verifyUserCredentials('11111111', 'wrong')).rejects.toBeInstanceOf(
      LoginCooldownError
    );

    expect(committed).toBe(true);
    expect(transaction.auditLog.create).toHaveBeenCalledExactlyOnceWith({
      data: {
        action: 'loginFailure',
        entity: 'authentication',
        details: { documentId: '11111111', reason: 'invalidCredentials' },
      },
    });
    expect(transaction.loginThrottle.update).toHaveBeenCalledWith({
      where: { documentId: '11111111' },
      data: { failedAttempts: 5, blockedUntil: new Date('2026-10-26T15:05:00.000Z') },
    });
  });

  test('counts the first failure after an expired cooldown as the first of five new attempts', async () => {
    vi.useFakeTimers({ toFake: ['Date'] });
    const deadline = new Date('2026-10-26T15:05:00Z');
    vi.setSystemTime(deadline);
    transaction.$queryRaw.mockResolvedValue([{ failedAttempts: 5, blockedUntil: deadline }]);
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(verifyUserCredentials('11111111', 'wrong')).resolves.toBeNull();

    expect(transaction.loginThrottle.update).toHaveBeenCalledWith({
      where: { documentId: '11111111' },
      data: { failedAttempts: 1, blockedUntil: null },
    });
    expect(transaction.auditLog.create).toHaveBeenCalledExactlyOnceWith({
      data: {
        action: 'loginFailure',
        entity: 'authentication',
        details: { documentId: '11111111', reason: 'invalidCredentials' },
      },
    });
  });

  test('propagates an audit failure so that the transaction cannot commit', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);
    transaction.auditLog.create.mockRejectedValue(new Error('audit unavailable'));

    await expect(verifyUserCredentials('11111111', 'wrong')).rejects.toThrow('audit unavailable');
  });
});

describe('hashPassword', () => {
  test('returns a bcrypt hash that verifies against the original password', async () => {
    const hash = await hashPassword('a-new-password');

    expect(hash).toMatch(/^\$2[aby]\$/);
    await expect(bcrypt.compare('a-new-password', hash)).resolves.toBe(true);
  });

  test('produces a different hash than a plain dummy comparison', async () => {
    const hash = await hashPassword(TEST_PASSWORD);

    expect(hash).not.toBe(TEST_PASSWORD_HASH);
  });
});

describe('verifyPassword', () => {
  test('resolves true when the password matches the hash', async () => {
    await expect(verifyPassword(TEST_PASSWORD, TEST_PASSWORD_HASH)).resolves.toBe(true);
  });

  test('resolves false when the password does not match the hash', async () => {
    await expect(verifyPassword('wrong-password', TEST_PASSWORD_HASH)).resolves.toBe(false);
  });
});
