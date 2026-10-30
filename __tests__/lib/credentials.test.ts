import bcrypt from 'bcryptjs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { makeUser, TEST_PASSWORD, TEST_PASSWORD_HASH } from '../fixtures/user';
import { hashPassword, toAuthUser, verifyPassword, verifyUserCredentials } from '@/lib/credentials';
import prisma from '@/lib/prisma';

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

  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
    compare = vi.spyOn(bcrypt, 'compare');
  });

  afterEach(() => {
    compare.mockRestore();
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
