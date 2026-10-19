import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { decode } from 'next-auth/jwt';
import { login } from '@/app/actions/auth';
import {
  getSessionMaxAge,
  SESSION_EXPIRATION_COOKIE,
  SESSION_EXPIRATION_COOKIE_OPTIONS,
} from '@/lib/auth/session-expiration';
import { hashPassword } from '@/lib/credentials';
import prisma from '@/lib/prisma';
import type { User } from '@/generated/prisma/client';

const SESSION_COOKIE = '__Secure-authjs.session-token';
const PASSWORD = 'integration-login-password';
const DOCUMENT_IDS = ['65432105', '65432111', '65432127', '65432133', '65432149'];

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
  const ids = createdUserIds;
  createdUserIds = [];
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
});

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

    const result = await login({}, buildFormData(user.documentId, 'wrong-password'));

    expect(result).toEqual({ formError: 'Invalid credentials', documentId: user.documentId });
    expect(cookieJar.size).toBe(0);
    expect((await loadUser(user.id)).lastAccess).toBeNull();
  });

  test('rejects a disabled user even with the right password', async () => {
    const user = await createUser({ status: 'disabled' });

    const result = await login({}, buildFormData(user.documentId));

    expect(result.formError).toBe('Invalid credentials');
    expect(cookieJar.size).toBe(0);
    expect((await loadUser(user.id)).lastAccess).toBeNull();
  });

  test('rejects a user with a pending invitation', async () => {
    const user = await createUser({ status: 'pendingInvitation' });

    const result = await login({}, buildFormData(user.documentId));

    expect(result.formError).toBe('Invalid credentials');
    expect(cookieJar.size).toBe(0);
  });

  test('rejects a deleted user', async () => {
    const user = await createUser({ deletedAt: new Date() });

    const result = await login({}, buildFormData(user.documentId));

    expect(result.formError).toBe('Invalid credentials');
    expect(cookieJar.size).toBe(0);
    expect((await loadUser(user.id)).lastAccess).toBeNull();
  });

  test('rejects a document id that does not belong to any user', async () => {
    const result = await login({}, buildFormData(DOCUMENT_IDS[4]));

    expect(result).toEqual({ formError: 'Invalid credentials', documentId: DOCUMENT_IDS[4] });
    expect(cookieJar.size).toBe(0);
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
  });
});
