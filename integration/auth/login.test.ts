import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { decode } from 'next-auth/jwt';
import { login } from '@/app/actions/auth';
import {
  getSessionMaxAge,
  SESSION_EXPIRATION_COOKIE,
  SESSION_EXPIRATION_COOKIE_OPTIONS,
} from '@/lib/auth/session-expiration';
import { hashPassword, verifyUserCredentials } from '@/lib/credentials';
import { LoginCooldownError } from '@/lib/auth/login-cooldown-error';
import prisma from '@/lib/prisma';
import type { Prisma, User } from '@/generated/prisma/client';
import { listAuditLog } from '@/lib/audit-log/list';
import { parseAuditLogFilters } from '@/lib/validation/audit-log-filters';

const SESSION_COOKIE = '__Secure-authjs.session-token';
const PASSWORD = 'integration-login-password';
const DOCUMENT_IDS = ['65432105', '65432111', '65432127', '65432133', '65432149'];
const LOGIN_TIME = new Date('2026-10-26T15:00:00.000Z');
const LOGIN_COOLDOWN_MS = 5 * 60 * 1000;

type StoredCookie = { value: string; options?: Record<string, unknown> };

const cookieJar = vi.hoisted(() => new Map<string, StoredCookie>());

vi.unmock('@/auth');
vi.mock('next/headers', () => ({
  headers: async () =>
    new Headers({
      host: 'localhost:3000',
      'x-forwarded-proto': 'https',
      cookie: [...cookieJar].map(([name, { value }]) => `${name}=${value}`).join('; '),
    }),
  cookies: async () => ({
    get: (name: string) => {
      const cookie = cookieJar.get(name);
      return cookie && { name, value: cookie.value };
    },
    set: (name: string, value: string, options?: Record<string, unknown>) => {
      cookieJar.set(name, { value, options });
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
}));

let passwordHash: string;
let createdUserIds: number[] = [];

async function createUser(overrides: Partial<User> = {}) {
  const index = createdUserIds.length;
  const user = await prisma.user.create({
    data: {
      firstName: 'Login',
      lastName: 'Integration',
      documentId: DOCUMENT_IDS[index],
      email: `integration-login-${index}@gurisesunidos.test`,
      role: 'coordinator',
      status: 'active',
      passwordHash,
      ...overrides,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

function buildFormData(documentId: string, password = PASSWORD, remember = false) {
  const formData = new FormData();
  formData.set('documentId', documentId);
  formData.set('password', password);
  if (remember) formData.set('rememberCheck', 'on');
  return formData;
}

function loadUser(id: number) {
  return prisma.user.findUniqueOrThrow({ where: { id } });
}

async function expectRedirectToDashboard(result: Promise<unknown>) {
  await expect(result).rejects.toThrow(/^NEXT_REDIRECT:\/dashboard$/);
}

async function decodeSessionCookie() {
  const cookie = cookieJar.get(SESSION_COOKIE);
  expect(cookie).toBeDefined();
  return decode({ token: cookie!.value, secret: process.env.AUTH_SECRET!, salt: SESSION_COOKIE });
}

function expectSessionToExpireAround(token: { exp?: unknown } | null, expectedTimestamp: number) {
  expect(Math.abs(Number(token?.exp) * 1000 - expectedTimestamp)).toBeLessThan(60_000);
  const cookie = cookieJar.get(SESSION_EXPIRATION_COOKIE);
  expect(cookie?.options).toEqual(SESSION_EXPIRATION_COOKIE_OPTIONS);
  expect(Math.abs(Number(cookie?.value) - expectedTimestamp)).toBeLessThan(60_000);
}

beforeEach(async () => {
  passwordHash ??= await hashPassword(PASSWORD);
  cookieJar.clear();
});

afterEach(async () => {
  vi.useRealTimers();
  const ids = createdUserIds;
  createdUserIds = [];
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.loginThrottle.deleteMany({ where: { documentId: { in: DOCUMENT_IDS } } });
  await prisma.auditLog.deleteMany({
    where: {
      action: 'loginFailure',
      OR: DOCUMENT_IDS.map((documentId) => ({
        details: { path: ['documentId'], equals: documentId },
      })),
    },
  });
});

function failedLoginEntries(documentId: string) {
  return prisma.auditLog.findMany({
    where: { action: 'loginFailure', details: { path: ['documentId'], equals: documentId } },
    orderBy: { id: 'asc' },
  });
}

describe('login (integration)', () => {
  test('signs in an active user, sets the session cookies and records the access', async () => {
    const user = await createUser();
    const before = Date.now();

    await expectRedirectToDashboard(login({}, buildFormData(user.documentId)));

    const token = await decodeSessionCookie();
    expect(token).toMatchObject({
      sub: String(user.id),
      role: 'coordinator',
      email: user.email,
      name: 'Login Integration',
      remember: false,
    });
    expectSessionToExpireAround(token, before + getSessionMaxAge(false) * 1000);
    const { lastAccess } = await loadUser(user.id);
    expect(lastAccess?.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(await failedLoginEntries(user.documentId)).toEqual([]);
  });

  test('extends the session when remember me is checked', async () => {
    const user = await createUser({ role: 'admin' });
    const before = Date.now();

    await expectRedirectToDashboard(login({}, buildFormData(user.documentId, PASSWORD, true)));

    const token = await decodeSessionCookie();
    expect(token).toMatchObject({
      sub: String(user.id),
      role: 'admin',
      remember: true,
    });
    expectSessionToExpireAround(token, before + getSessionMaxAge(true) * 1000);
  });

  test('accepts a document id written with dots and a dash', async () => {
    const user = await createUser();

    await expectRedirectToDashboard(login({}, buildFormData('6.543.210-5')));

    expect((await decodeSessionCookie())?.sub).toBe(String(user.id));
  });

  test('redirects to password reset when the user must change the password', async () => {
    const user = await createUser({ mustChangePassword: true });

    await expect(login({}, buildFormData(user.documentId))).rejects.toThrow(
      /^NEXT_REDIRECT:\/password-reset$/
    );

    expect((await decodeSessionCookie())?.sub).toBe(String(user.id));
  });

  test('rejects a wrong password without signing in', async () => {
    const user = await createUser();
    const before = Date.now();

    const result = await login({}, buildFormData(user.documentId, 'wrong-password'));

    expect(result).toEqual({ formError: 'Invalid credentials', documentId: user.documentId });
    expect(cookieJar.size).toBe(0);
    expect((await loadUser(user.id)).lastAccess).toBeNull();
    const entries = await failedLoginEntries(user.documentId);
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({
      authorId: null,
      entityId: null,
      action: 'loginFailure',
      entity: 'authentication',
      details: { documentId: user.documentId, reason: 'invalidCredentials' },
    });
    expect(entries[0].occurredAt.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(entries[0].occurredAt.getTime()).toBeLessThanOrEqual(Date.now() + 1000);
  });

  test('rejects a disabled user even with the right password', async () => {
    const user = await createUser({ status: 'disabled' });

    const result = await login({}, buildFormData(user.documentId));

    expect(result.formError).toBe('Invalid credentials');
    expect(cookieJar.size).toBe(0);
    expect((await loadUser(user.id)).lastAccess).toBeNull();
    expect(await failedLoginEntries(user.documentId)).toHaveLength(1);
  });

  test('rejects a user with a pending invitation', async () => {
    const user = await createUser({ status: 'pendingInvitation' });

    const result = await login({}, buildFormData(user.documentId));

    expect(result.formError).toBe('Invalid credentials');
    expect(cookieJar.size).toBe(0);
    expect(await failedLoginEntries(user.documentId)).toHaveLength(1);
  });

  test('rejects a deleted user', async () => {
    const user = await createUser({ deletedAt: new Date() });

    const result = await login({}, buildFormData(user.documentId));

    expect(result.formError).toBe('Invalid credentials');
    expect(cookieJar.size).toBe(0);
    expect((await loadUser(user.id)).lastAccess).toBeNull();
    expect(await failedLoginEntries(user.documentId)).toHaveLength(1);
  });

  test('rejects a document id that does not belong to any user', async () => {
    const result = await login({}, buildFormData(DOCUMENT_IDS[4]));

    expect(result).toEqual({ formError: 'Invalid credentials', documentId: DOCUMENT_IDS[4] });
    expect(cookieJar.size).toBe(0);
    expect(await failedLoginEntries(DOCUMENT_IDS[4])).toHaveLength(1);
  });

  test('returns field errors for an invalid document id without signing in', async () => {
    const result = await login({}, buildFormData('12345678', ''));

    expect(result).toEqual({
      errors: {
        documentId: ['Ingresá una cédula uruguaya válida.'],
        password: ['La contraseña es obligatoria.'],
      },
      documentId: '12345678',
    });
    expect(cookieJar.size).toBe(0);
    expect(
      await prisma.loginThrottle.findUnique({
        where: { documentId: '12345678' },
      })
    ).toBeNull();
    expect(await failedLoginEntries('12345678')).toEqual([]);
  });
});

describe('failed login audit (integration)', () => {
  test('rolls back the failure counter when the audit insert fails', async () => {
    const user = await createUser();
    await verifyUserCredentials(user.documentId, 'wrong-password');
    const transaction = prisma.$transaction.bind(prisma);
    const transactionSpy = vi.spyOn(prisma, '$transaction');
    transactionSpy.mockImplementationOnce((async (
      callback: (tx: Prisma.TransactionClient) => Promise<unknown>,
      options?: {
        maxWait?: number;
        timeout?: number;
        isolationLevel?: Prisma.TransactionIsolationLevel;
      }
    ) =>
      transaction(async (tx) => {
        const create = vi
          .spyOn(tx.auditLog, 'create')
          .mockRejectedValue(new Error('audit unavailable'));
        try {
          return await callback(tx);
        } finally {
          create.mockRestore();
        }
      }, options)) as (
      callback: (tx: Prisma.TransactionClient) => Promise<unknown>
    ) => Promise<unknown>);

    try {
      await expect(verifyUserCredentials(user.documentId, 'wrong-password')).rejects.toThrow(
        'audit unavailable'
      );
    } finally {
      transactionSpy.mockRestore();
    }

    expect(
      await prisma.loginThrottle.findUniqueOrThrow({ where: { documentId: user.documentId } })
    ).toMatchObject({ failedAttempts: 1, blockedUntil: null });
    expect(await failedLoginEntries(user.documentId)).toHaveLength(1);
  });

  test('includes failed logins in the shared history and applies filters and pagination in the database', async () => {
    const user = await createUser();
    await verifyUserCredentials('6.543.210-5', 'wrong-password');
    const [entry] = await failedLoginEntries(user.documentId);
    const filters = { action: 'loginFailure', entity: 'authentication', documentId: '6.543.210-5' };

    const history = await listAuditLog(parseAuditLogFilters(filters));

    expect(history).toMatchObject({ total: 1, page: 1, totalPages: 1 });
    expect(history.items[0]).toMatchObject({
      id: entry.id,
      author: null,
      entityName: `Cédula ingresada: ${user.documentId}`,
      summary: 'Autenticación fallida',
    });
    expect((await listAuditLog(parseAuditLogFilters({ documentId: user.documentId }))).total).toBe(
      1
    );
    expect(
      (await listAuditLog(parseAuditLogFilters({ ...filters, action: 'creation' }))).total
    ).toBe(0);
    expect(
      (await listAuditLog(parseAuditLogFilters({ ...filters, authorId: String(user.id) }))).total
    ).toBe(0);
    expect((await listAuditLog(parseAuditLogFilters({ ...filters, to: '2000-01-01' }))).total).toBe(
      0
    );

    await prisma.auditLog.createMany({
      data: Array.from({ length: 20 }, () => ({
        action: 'loginFailure' as const,
        entity: 'authentication' as const,
        details: { documentId: user.documentId, reason: 'blocked' },
      })),
    });
    const firstPage = await listAuditLog(parseAuditLogFilters(filters));
    const secondPage = await listAuditLog(parseAuditLogFilters({ ...filters, page: '2' }));
    expect(firstPage).toMatchObject({ total: 21, page: 1, totalPages: 2 });
    expect(firstPage.items).toHaveLength(20);
    expect(secondPage.items).toHaveLength(1);
    expect(secondPage.items[0].id).toBe(entry.id);
    expect(new Set([...firstPage.items, ...secondPage.items].map(({ id }) => id)).size).toBe(21);
  });

  test('keeps author and record requirements for regular audits and validates login details', async () => {
    await expect(
      prisma.auditLog.create({ data: { action: 'creation', entity: 'user' } })
    ).rejects.toThrow();
    await expect(
      prisma.auditLog.create({
        data: {
          action: 'loginFailure',
          entity: 'authentication',
          details: { documentId: DOCUMENT_IDS[0] },
        },
      })
    ).rejects.toThrow();
    await expect(
      prisma.auditLog.create({
        data: {
          action: 'loginFailure',
          entity: 'user',
          details: { documentId: DOCUMENT_IDS[0], reason: 'blocked' },
        },
      })
    ).rejects.toThrow();
  });
});

describe('login cooldown (integration)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(LOGIN_TIME);
  });

  async function expectFreeFailedAttempts(documentId: string, count = 4) {
    for (let attempt = 0; attempt < count; attempt++) {
      expect(await login({}, buildFormData(documentId, 'wrong-password'))).toEqual({
        formError: 'Invalid credentials',
        documentId,
      });
    }
  }

  test('allows five attempts and persists the cooldown when the fifth one fails', async () => {
    const user = await createUser();
    await expectFreeFailedAttempts(user.documentId);
    expect(
      await prisma.loginThrottle.findUniqueOrThrow({
        where: { documentId: user.documentId },
      })
    ).toMatchObject({ failedAttempts: 4, blockedUntil: null });

    const result = await login({}, buildFormData('6.543.210-5', 'wrong-password'));
    const blockedUntil = new Date(LOGIN_TIME.getTime() + LOGIN_COOLDOWN_MS);

    expect(result).toEqual({
      formError: 'Login cooldown',
      documentId: user.documentId,
      nextAllowedAt: blockedUntil.toISOString(),
      retryAfterSeconds: 300,
    });
    expect(
      await prisma.loginThrottle.findUniqueOrThrow({
        where: { documentId: user.documentId },
      })
    ).toMatchObject({ failedAttempts: 5, blockedUntil });
    expect(cookieJar.size).toBe(0);
    expect((await loadUser(user.id)).lastAccess).toBeNull();
    expect(await failedLoginEntries(user.documentId)).toHaveLength(5);
  });

  test('rejects correct credentials during the wait without extending the deadline', async () => {
    const user = await createUser();
    const blockedUntil = new Date(LOGIN_TIME.getTime() + LOGIN_COOLDOWN_MS);
    await prisma.loginThrottle.create({
      data: { documentId: user.documentId, failedAttempts: 5, blockedUntil },
    });
    vi.setSystemTime(blockedUntil.getTime() - 1);

    expect(await login({}, buildFormData(user.documentId))).toEqual({
      formError: 'Login cooldown',
      documentId: user.documentId,
      nextAllowedAt: blockedUntil.toISOString(),
      retryAfterSeconds: 1,
    });
    expect(
      await prisma.loginThrottle.findUniqueOrThrow({
        where: { documentId: user.documentId },
      })
    ).toMatchObject({ failedAttempts: 5, blockedUntil });
    expect(cookieJar.size).toBe(0);
    expect(await failedLoginEntries(user.documentId)).toMatchObject([
      { details: { documentId: user.documentId, reason: 'blocked' } },
    ]);
  });

  test('restores five attempts at each deadline and blocks again only after the fifth failure', async () => {
    const user = await createUser();
    const firstDeadline = new Date(LOGIN_TIME.getTime() + LOGIN_COOLDOWN_MS);
    await prisma.loginThrottle.create({
      data: { documentId: user.documentId, failedAttempts: 5, blockedUntil: firstDeadline },
    });

    for (let attempt = 1; attempt <= 2; attempt++) {
      vi.setSystemTime(LOGIN_TIME.getTime() + attempt * LOGIN_COOLDOWN_MS);
      const nextDeadline = new Date(Date.now() + LOGIN_COOLDOWN_MS);

      await expectFreeFailedAttempts(user.documentId);
      expect(
        await prisma.loginThrottle.findUniqueOrThrow({ where: { documentId: user.documentId } })
      ).toMatchObject({ failedAttempts: 4, blockedUntil: null });

      expect(await login({}, buildFormData(user.documentId, 'wrong-password'))).toEqual({
        formError: 'Login cooldown',
        documentId: user.documentId,
        nextAllowedAt: nextDeadline.toISOString(),
        retryAfterSeconds: 300,
      });
      expect(
        await prisma.loginThrottle.findUniqueOrThrow({
          where: { documentId: user.documentId },
        })
      ).toMatchObject({ failedAttempts: 5, blockedUntil: nextDeadline });
      expect(await login({}, buildFormData(user.documentId))).toMatchObject({
        formError: 'Login cooldown',
        nextAllowedAt: nextDeadline.toISOString(),
      });
      const entries = await failedLoginEntries(user.documentId);
      expect(entries).toHaveLength(attempt * 6);
      expect(
        entries.slice(-6).map(({ details }) => (details as { reason: string }).reason)
      ).toEqual([...Array(5).fill('invalidCredentials'), 'blocked']);
    }
    expect(cookieJar.size).toBe(0);
  });

  test('resets the cooldown after a successful login at the deadline and restores five attempts', async () => {
    const user = await createUser();
    const blockedUntil = new Date(LOGIN_TIME.getTime() + LOGIN_COOLDOWN_MS);
    await prisma.loginThrottle.create({
      data: { documentId: user.documentId, failedAttempts: 5, blockedUntil },
    });
    vi.setSystemTime(blockedUntil);

    await expectRedirectToDashboard(login({}, buildFormData(user.documentId)));

    expect(
      await prisma.loginThrottle.findUniqueOrThrow({
        where: { documentId: user.documentId },
      })
    ).toMatchObject({ failedAttempts: 0, blockedUntil: null });
    expect((await decodeSessionCookie())?.sub).toBe(String(user.id));
    await expectFreeFailedAttempts(user.documentId);
    expect((await login({}, buildFormData(user.documentId, 'wrong-password'))).formError).toBe(
      'Login cooldown'
    );
  });

  test('resets failures after a successful login before reaching the limit', async () => {
    const user = await createUser();
    await expectFreeFailedAttempts(user.documentId);

    await expectRedirectToDashboard(login({}, buildFormData(user.documentId)));

    expect(
      await prisma.loginThrottle.findUniqueOrThrow({
        where: { documentId: user.documentId },
      })
    ).toMatchObject({ failedAttempts: 0, blockedUntil: null });
    expect(await failedLoginEntries(user.documentId)).toHaveLength(4);
    await expectFreeFailedAttempts(user.documentId);
  });

  test('applies the same cooldown to document ids without an account', async () => {
    const documentId = DOCUMENT_IDS[4];
    await expectFreeFailedAttempts(documentId);

    expect(await login({}, buildFormData(documentId, 'wrong-password'))).toEqual({
      formError: 'Login cooldown',
      documentId,
      nextAllowedAt: new Date(LOGIN_TIME.getTime() + LOGIN_COOLDOWN_MS).toISOString(),
      retryAfterSeconds: 300,
    });
    expect(await prisma.user.findUnique({ where: { documentId } })).toBeNull();
  });

  test('keeps failures when attempts are days apart', async () => {
    const user = await createUser();
    await expectFreeFailedAttempts(user.documentId);
    vi.setSystemTime(LOGIN_TIME.getTime() + 24 * 60 * 60 * 1000);

    expect(await login({}, buildFormData(user.documentId, 'wrong-password'))).toMatchObject({
      formError: 'Login cooldown',
      nextAllowedAt: new Date(Date.now() + LOGIN_COOLDOWN_MS).toISOString(),
    });
  });

  test('counts concurrent attempts for a new document id without losing failures', async () => {
    const user = await createUser();

    const results = await Promise.allSettled(
      Array.from({ length: 7 }, () => verifyUserCredentials(user.documentId, 'wrong-password'))
    );

    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(4);
    for (const result of results) {
      if (result.status === 'fulfilled') {
        expect(result.value).toBeNull();
      } else {
        expect(result.reason).toBeInstanceOf(LoginCooldownError);
      }
    }
    expect(
      await prisma.loginThrottle.findUniqueOrThrow({
        where: { documentId: user.documentId },
      })
    ).toMatchObject({
      failedAttempts: 5,
      blockedUntil: new Date(LOGIN_TIME.getTime() + LOGIN_COOLDOWN_MS),
    });
    const entries = await failedLoginEntries(user.documentId);
    expect(entries).toHaveLength(7);
    expect(entries.map(({ details }) => (details as { reason: string }).reason)).toEqual([
      ...Array(5).fill('invalidCredentials'),
      ...Array(2).fill('blocked'),
    ]);
  });

  test('serializes concurrent retries after the cooldown expires', async () => {
    const user = await createUser();
    await prisma.loginThrottle.create({
      data: { documentId: user.documentId, failedAttempts: 5, blockedUntil: LOGIN_TIME },
    });

    const compare = vi.spyOn(bcrypt, 'compare');
    try {
      const results = await Promise.allSettled(
        Array.from({ length: 7 }, () => verifyUserCredentials(user.documentId, 'wrong-password'))
      );

      expect(results.filter(({ status }) => status === 'fulfilled')).toHaveLength(4);
      for (const result of results) {
        if (result.status === 'fulfilled') {
          expect(result.value).toBeNull();
        } else {
          expect(result.reason).toBeInstanceOf(LoginCooldownError);
        }
      }
      expect(compare).toHaveBeenCalledTimes(5);
      const entries = await failedLoginEntries(user.documentId);
      expect(entries).toHaveLength(7);
      expect(entries.map(({ details }) => (details as { reason: string }).reason)).toEqual([
        ...Array(5).fill('invalidCredentials'),
        ...Array(2).fill('blocked'),
      ]);
      expect(
        await prisma.loginThrottle.findUniqueOrThrow({
          where: { documentId: user.documentId },
        })
      ).toMatchObject({
        failedAttempts: 5,
        blockedUntil: new Date(LOGIN_TIME.getTime() + LOGIN_COOLDOWN_MS),
      });
    } finally {
      compare.mockRestore();
    }
  });
});
