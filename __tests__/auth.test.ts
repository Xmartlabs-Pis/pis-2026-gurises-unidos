import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { NextAuthConfig } from 'next-auth';
import { makeUser } from './fixtures/user';
import { toAuthUser, verifyUserCredentials } from '@/lib/credentials';
import prisma from '@/lib/prisma';
import { encode } from 'next-auth/jwt';

const authConfig = vi.hoisted(() => ({
  current: undefined as NextAuthConfig | undefined,
}));

vi.mock('next-auth', () => ({
  default: (config: NextAuthConfig) => {
    authConfig.current = config;
    return { handlers: {}, signIn: vi.fn(), signOut: vi.fn(), auth: vi.fn() };
  },
}));

vi.mock('next-auth/providers/credentials', () => ({
  default: (options: object) => ({ id: 'credentials', ...options }),
}));

vi.mock('next-auth/jwt', () => ({
  encode: vi.fn().mockResolvedValue('mock-encoded-token'),
}));

vi.mock('@/lib/credentials', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/credentials')>();
  return { ...actual, verifyUserCredentials: vi.fn() };
});

import '@/auth';

function capturedConfig() {
  expect(authConfig.current).toBeDefined();
  return authConfig.current!;
}

function authorize() {
  const provider = capturedConfig().providers[0] as unknown as {
    authorize: (
      credentials?: Partial<Record<'documentId' | 'password' | 'remember', unknown>>
    ) => Promise<unknown>;
  };
  return provider.authorize;
}

describe('auth config', () => {
  test('uses a 30-day jwt session ceiling', () => {
    expect(capturedConfig().session).toMatchObject({
      strategy: 'jwt',
      maxAge: 30 * 24 * 60 * 60,
      updateAge: 0,
    });
  });
});

describe('jwt.encode', () => {
  beforeEach(() => {
    vi.mocked(encode).mockClear();
  });

  test('uses the 12-hour session length when remember is false', async () => {
    await capturedConfig().jwt?.encode?.({
      token: { sub: '1', remember: false },
      secret: 'secret',
      salt: 'salt',
    } as never);

    expect(encode).toHaveBeenCalledWith(expect.objectContaining({ maxAge: 12 * 60 * 60 }));
  });

  test('uses the 30-day ceiling when remember is true', async () => {
    await capturedConfig().jwt?.encode?.({
      token: { sub: '1', remember: true },
      secret: 'secret',
      salt: 'salt',
    } as never);

    expect(encode).toHaveBeenCalledWith(expect.objectContaining({ maxAge: 30 * 24 * 60 * 60 }));
  });
});

describe('authorize', () => {
  beforeEach(() => {
    vi.mocked(verifyUserCredentials).mockReset();
  });

  test('returns null when documentId is not a string', async () => {
    await expect(authorize()({ documentId: 41234567, password: 'password' })).resolves.toBeNull();
    expect(verifyUserCredentials).not.toHaveBeenCalled();
  });

  test('returns null when password is not a string', async () => {
    await expect(authorize()({ documentId: '41234567', password: null })).resolves.toBeNull();
    expect(verifyUserCredentials).not.toHaveBeenCalled();
  });

  test('returns null when credentials are missing', async () => {
    await expect(authorize()(undefined)).resolves.toBeNull();
    await expect(authorize()({})).resolves.toBeNull();
    expect(verifyUserCredentials).not.toHaveBeenCalled();
  });

  test('returns the auth user when credentials match', async () => {
    const user = makeUser();
    vi.mocked(verifyUserCredentials).mockResolvedValue(user);

    await expect(
      authorize()({ documentId: user.documentId, password: 'password' })
    ).resolves.toEqual({ ...toAuthUser(user), remember: false });
    expect(verifyUserCredentials).toHaveBeenCalledWith(user.documentId, 'password');
  });

  test('sets remember: true only when credentials.remember is the string "true"', async () => {
    const user = makeUser();
    vi.mocked(verifyUserCredentials).mockResolvedValue(user);

    await expect(
      authorize()({ documentId: user.documentId, password: 'password', remember: 'true' })
    ).resolves.toEqual({ ...toAuthUser(user), remember: true });
    await expect(
      authorize()({ documentId: user.documentId, password: 'password', remember: 'false' })
    ).resolves.toEqual({ ...toAuthUser(user), remember: false });
  });

  test('returns null when verifyUserCredentials returns null', async () => {
    vi.mocked(verifyUserCredentials).mockResolvedValue(null);

    await expect(authorize()({ documentId: '41234567', password: 'password' })).resolves.toBeNull();
    expect(verifyUserCredentials).toHaveBeenCalledWith('41234567', 'password');
  });
});

describe('jwt', () => {
  beforeEach(() => {
    vi.mocked(prisma.user.findUnique).mockReset();
  });

  test('sets sub, role, avatar color, mustChangePassword, and remember when a user is present', async () => {
    const token = { sub: 'old' };
    const user = {
      id: '42',
      role: 'coordinator' as const,
      avatarColorIndex: 7,
      mustChangePassword: true,
      remember: true,
    };

    await expect(capturedConfig().callbacks?.jwt?.({ token, user } as never)).resolves.toEqual({
      sub: '42',
      role: 'coordinator',
      avatarColorIndex: 7,
      mustChangePassword: true,
      remember: true,
    });
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  test('returns the token unchanged when the user has no sub or iat', async () => {
    const token = { role: 'admin' as const };

    await expect(capturedConfig().callbacks?.jwt?.({ token } as never)).resolves.toEqual(token);
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  test('invalidates the session when the token subject is not a valid user id', async () => {
    const token = { sub: 'invalid', role: 'admin' as const, iat: 1_000 };

    await expect(capturedConfig().callbacks?.jwt?.({ token } as never)).resolves.toBeNull();
    expect(prisma.user.findUnique).not.toHaveBeenCalled();
  });

  test('refreshes identity and role from the active database user', async () => {
    const token = {
      sub: '1',
      name: 'Old Name',
      email: 'old@example.com',
      role: 'coordinator' as const,
      iat: 1_000,
    };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      makeUser({
        id: 1,
        firstName: 'Ana',
        lastName: 'Admin',
        email: 'ana@example.com',
        documentId: '41234567',
        role: 'admin',
        passwordChangedAt: null,
        mustChangePassword: true,
      })
    );

    await expect(capturedConfig().callbacks?.jwt?.({ token } as never)).resolves.toEqual({
      sub: '1',
      name: 'Ana Admin',
      email: 'ana@example.com',
      role: 'admin',
      avatarColorIndex: 7,
      mustChangePassword: true,
      iat: 1_000,
    });
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 1 },
      select: {
        firstName: true,
        lastName: true,
        email: true,
        documentId: true,
        role: true,
        status: true,
        passwordChangedAt: true,
        mustChangePassword: true,
        deletedAt: true,
      },
    });
  });

  test('keeps the session valid when the password changed before the token was issued', async () => {
    const token = { sub: '1', role: 'admin' as const, iat: 1_000 };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      makeUser({ passwordChangedAt: new Date(500 * 1000) })
    );

    await expect(capturedConfig().callbacks?.jwt?.({ token } as never)).resolves.toEqual(
      expect.objectContaining({ sub: '1', role: 'admin' })
    );
  });

  test('keeps the session valid when the password changed in the same second the token was issued', async () => {
    const token = { sub: '1', role: 'admin' as const, iat: 1_000 };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      makeUser({ passwordChangedAt: new Date(1_000 * 1000 + 500) })
    );

    await expect(capturedConfig().callbacks?.jwt?.({ token } as never)).resolves.toEqual(
      expect.objectContaining({ sub: '1', role: 'admin' })
    );
  });

  test('invalidates the session when the password changed after the token was issued', async () => {
    const token = { sub: '1', role: 'admin' as const, iat: 1_000 };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(
      makeUser({ passwordChangedAt: new Date(1_500 * 1000) })
    );

    await expect(capturedConfig().callbacks?.jwt?.({ token } as never)).resolves.toBeNull();
  });

  test.each([
    ['missing', null],
    ['disabled', makeUser({ status: 'disabled' })],
    ['deleted', makeUser({ deletedAt: new Date('2026-01-02T00:00:00.000Z') })],
  ])('invalidates the session when the database user is %s', async (_state, currentUser) => {
    const token = { sub: '1', role: 'admin' as const, iat: 1_000 };
    vi.mocked(prisma.user.findUnique).mockResolvedValue(currentUser);

    await expect(capturedConfig().callbacks?.jwt?.({ token } as never)).resolves.toBeNull();
  });
});

describe('session', () => {
  test('copies id, role, avatar color, remember, and mustChangePassword from the token onto session.user', () => {
    const session = { user: { name: 'Ana Admin' }, expires: '2026-01-01T00:00:00.000Z' };
    const token = {
      sub: '42',
      role: 'coordinator' as const,
      avatarColorIndex: 7,
      remember: true,
      mustChangePassword: true,
    };

    expect(capturedConfig().callbacks?.session?.({ session, token } as never)).toEqual({
      user: {
        name: 'Ana Admin',
        id: '42',
        role: 'coordinator',
        avatarColorIndex: 7,
        remember: true,
        mustChangePassword: true,
      },
      expires: '2026-01-01T00:00:00.000Z',
    });
  });

  test('leaves the session unchanged when token.sub is missing', () => {
    const session = { user: { name: 'Ana Admin' }, expires: '2026-01-01T00:00:00.000Z' };
    const token = { role: 'admin' as const };

    expect(capturedConfig().callbacks?.session?.({ session, token } as never)).toEqual(session);
  });
});

describe('signIn event', () => {
  let errorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  test('does not update lastAccess when user.id is missing', async () => {
    await capturedConfig().events?.signIn?.({ user: {} } as never);

    expect(prisma.user.update).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('records lastAccess for the numeric user id', async () => {
    vi.mocked(prisma.user.update).mockResolvedValue(makeUser({ id: 42 }));

    await capturedConfig().events?.signIn?.({ user: { id: '42' } } as never);

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: 42 },
      data: { lastAccess: expect.any(Date) },
    });
    expect(errorSpy).not.toHaveBeenCalled();
  });

  test('swallows update failures and logs them', async () => {
    const failure = new Error('db down');
    vi.mocked(prisma.user.update).mockRejectedValue(failure);

    await expect(
      capturedConfig().events?.signIn?.({ user: { id: '42' } } as never)
    ).resolves.toBeUndefined();

    expect(errorSpy).toHaveBeenCalledWith('Failed to record lastAccess', failure);
  });
});
