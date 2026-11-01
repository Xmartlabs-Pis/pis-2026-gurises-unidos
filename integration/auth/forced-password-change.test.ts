import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { CredentialsSignin } from 'next-auth';
import { completeForcedPasswordChange } from '@/app/actions/password';
import { signIn } from '@/auth';
import {
  getSessionExpirationTimestamp,
  SESSION_EXPIRATION_COOKIE,
  SESSION_EXPIRATION_COOKIE_OPTIONS,
} from '@/lib/auth/session-expiration';
import { hashPassword, verifyPassword } from '@/lib/credentials';
import prisma from '@/lib/prisma';
import type { User } from '@/generated/prisma/client';
import { signInAs } from '../session';

const TEMPORARY_PASSWORD = 'Temporary1';
const NEW_PASSWORD = 'NewPassword1';
const DOCUMENT_IDS = ['55555551', '55555552', '55555553'];

const cookieStore = vi.hoisted(() => ({ set: vi.fn() }));

vi.mock('next/headers', () => ({ cookies: async () => cookieStore }));

let passwordHash: string;
let createdUserIds: number[] = [];

async function createUser(overrides: Partial<User> = {}) {
  const index = createdUserIds.length;
  const user = await prisma.user.create({
    data: {
      firstName: 'Forced',
      lastName: 'Password',
      documentId: DOCUMENT_IDS[index],
      email: `integration-forced-password-${index}@gurisesunidos.test`,
      role: 'coordinator',
      status: 'active',
      passwordHash,
      mustChangePassword: true,
      ...overrides,
    },
  });
  createdUserIds.push(user.id);
  return user;
}

function buildFormData(newPassword = NEW_PASSWORD, confirmNewPassword = newPassword) {
  const formData = new FormData();
  formData.set('newPassword', newPassword);
  formData.set('confirmNewPassword', confirmNewPassword);
  return formData;
}

function loadUser(id: number) {
  return prisma.user.findUniqueOrThrow({ where: { id } });
}

function auditLogsFor(userId: number) {
  return prisma.auditLog.findMany({ where: { entity: 'user', entityId: userId } });
}

async function expectUnchanged(user: User, result: Promise<unknown>) {
  const response = await result;
  expect(await loadUser(user.id)).toEqual(user);
  expect(await auditLogsFor(user.id)).toEqual([]);
  expect(signIn).not.toHaveBeenCalled();
  return response;
}

beforeAll(async () => {
  passwordHash = await hashPassword(TEMPORARY_PASSWORD);
});

afterEach(async () => {
  vi.mocked(signIn).mockReset();
  cookieStore.set.mockReset();
  const ids = createdUserIds;
  createdUserIds = [];
  await prisma.$transaction([
    prisma.auditLog.deleteMany({
      where: { OR: [{ authorId: { in: ids } }, { entity: 'user', entityId: { in: ids } }] },
    }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
});

describe('completeForcedPasswordChange (integration)', () => {
  test('stores the new password, audits it and signs the user in again', async () => {
    const user = await createUser();
    signInAs(user.id, 'coordinator');
    const before = Date.now();

    await expect(completeForcedPasswordChange({}, buildFormData())).rejects.toThrow(
      /^NEXT_REDIRECT:\/dashboard$/
    );

    const updated = await loadUser(user.id);
    expect(updated.mustChangePassword).toBe(false);
    expect(updated.passwordChangedAt?.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(await verifyPassword(NEW_PASSWORD, updated.passwordHash)).toBe(true);
    expect(await verifyPassword(TEMPORARY_PASSWORD, updated.passwordHash)).toBe(false);
    expect(await auditLogsFor(user.id)).toEqual([
      expect.objectContaining({ action: 'passwordChange', authorId: user.id }),
    ]);
    expect(signIn).toHaveBeenCalledWith('credentials', {
      documentId: user.documentId,
      password: NEW_PASSWORD,
      remember: 'false',
      redirect: false,
    });
    const [name, value, options] = cookieStore.set.mock.calls[0];
    expect(name).toBe(SESSION_EXPIRATION_COOKIE);
    expect(options).toEqual(SESSION_EXPIRATION_COOKIE_OPTIONS);
    expect(Math.abs(Number(value) - getSessionExpirationTimestamp(false))).toBeLessThan(60_000);
  });

  test('keeps the remember me choice of the current session', async () => {
    const user = await createUser();
    signInAs(user.id, 'coordinator', { remember: true });

    await expect(completeForcedPasswordChange({}, buildFormData())).rejects.toThrow(
      /^NEXT_REDIRECT:\/dashboard$/
    );

    expect(signIn).toHaveBeenCalledWith(
      'credentials',
      expect.objectContaining({ remember: 'true' })
    );
    const [, value] = cookieStore.set.mock.calls[0];
    expect(Math.abs(Number(value) - getSessionExpirationTimestamp(true))).toBeLessThan(60_000);
  });

  test('keeps the new password and sends to login when signing in again fails', async () => {
    const user = await createUser();
    signInAs(user.id, 'coordinator');
    vi.mocked(signIn).mockRejectedValueOnce(new CredentialsSignin());

    await expect(completeForcedPasswordChange({}, buildFormData())).rejects.toThrow(
      /^NEXT_REDIRECT:\/login\?passwordChanged=1$/
    );

    const updated = await loadUser(user.id);
    expect(updated.mustChangePassword).toBe(false);
    expect(await verifyPassword(NEW_PASSWORD, updated.passwordHash)).toBe(true);
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  test('rejects reusing the temporary password', async () => {
    const user = await createUser();
    signInAs(user.id, 'coordinator');

    const result = await expectUnchanged(
      user,
      completeForcedPasswordChange({}, buildFormData(TEMPORARY_PASSWORD))
    );

    expect(result).toEqual({
      errors: { newPassword: ['La nueva contraseña debe ser distinta a la actual.'] },
    });
  });

  test('rejects a user that does not have to change the password', async () => {
    const user = await createUser({ mustChangePassword: false });
    signInAs(user.id, 'coordinator');

    const result = await expectUnchanged(user, completeForcedPasswordChange({}, buildFormData()));

    expect(result).toEqual({ formError: 'La contraseña ya fue actualizada.' });
  });

  test('returns field errors when the passwords are invalid or do not match', async () => {
    const user = await createUser();
    signInAs(user.id, 'coordinator');

    const weak = await expectUnchanged(
      user,
      completeForcedPasswordChange({}, buildFormData('weak'))
    );
    const mismatch = await expectUnchanged(
      user,
      completeForcedPasswordChange({}, buildFormData(NEW_PASSWORD, 'OtherPassword1'))
    );

    expect(weak).toMatchObject({ errors: { newPassword: expect.any(Array) } });
    expect(mismatch).toEqual({ errors: { confirmNewPassword: ['Las contraseñas no coinciden'] } });
  });

  test('rejects a disabled user', async () => {
    const user = await createUser({ status: 'disabled' });
    signInAs(user.id, 'coordinator');

    const result = await expectUnchanged(user, completeForcedPasswordChange({}, buildFormData()));

    expect(result).toEqual({ formError: 'Tu sesión ya no es válida. Iniciá sesión de nuevo.' });
  });

  test('rejects when nobody is signed in', async () => {
    const user = await createUser();

    const result = await expectUnchanged(user, completeForcedPasswordChange({}, buildFormData()));

    expect(result).toEqual({ formError: 'Tu sesión ya no es válida. Iniciá sesión de nuevo.' });
  });
});
