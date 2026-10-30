import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { resetPassword } from '@/app/actions/password';
import { verifyPassword } from '@/lib/credentials';
import prisma from '@/lib/prisma';
import type { User } from '@/generated/prisma/client';
import { loadSeedData, type SeedData } from '../fixtures';
import { signInAs } from '../session';
import {
  createTestUser,
  deleteTestUsers,
  TEST_USER_PASSWORD,
  userAuditLogsFor,
} from '../users/user-helpers';

const NEW_PASSWORD = 'NewPassword2';
const DOCUMENT_ID = '54321016';

let seed: SeedData;

function buildFormData(userId: number | string, newPassword = NEW_PASSWORD) {
  const formData = new FormData();
  formData.set('userId', String(userId));
  formData.set('newPassword', newPassword);
  return formData;
}

function loadUser(id: number) {
  return prisma.user.findUniqueOrThrow({ where: { id } });
}

async function expectPasswordReset(id: number) {
  const user = await loadUser(id);
  expect(await verifyPassword(NEW_PASSWORD, user.passwordHash)).toBe(true);
  expect(await verifyPassword(TEST_USER_PASSWORD, user.passwordHash)).toBe(false);
  expect(user.mustChangePassword).toBe(true);
  return user;
}

async function expectUnchanged(original: User) {
  const user = await loadUser(original.id);
  expect(user.passwordHash).toBe(original.passwordHash);
  expect(user.passwordChangedAt).toEqual(original.passwordChangedAt);
  expect(user.mustChangePassword).toBe(original.mustChangePassword);
  expect(await userAuditLogsFor(original.id)).toEqual([]);
}

beforeAll(async () => {
  seed = await loadSeedData();
});

afterEach(async () => {
  await deleteTestUsers([DOCUMENT_ID]);
});

describe('resetPassword (integration)', () => {
  test('replaces the password, forces a change on next login and audits the reset', async () => {
    const user = await createTestUser(DOCUMENT_ID);
    signInAs(seed.adminId, 'admin');
    const before = Date.now();

    const result = await resetPassword({}, buildFormData(user.id));

    expect(result).toEqual({ success: true });
    const updated = await expectPasswordReset(user.id);
    expect(updated.passwordChangedAt?.getTime()).toBeGreaterThanOrEqual(before - 1000);
    expect(await userAuditLogsFor(user.id)).toEqual([
      expect.objectContaining({
        entity: 'user',
        action: 'passwordReset',
        entityId: user.id,
        authorId: seed.adminId,
      }),
    ]);
  });

  test('resets the password of another admin', async () => {
    const user = await createTestUser(DOCUMENT_ID, { role: 'admin' });
    signInAs(seed.adminId, 'admin');

    const result = await resetPassword({}, buildFormData(user.id));

    expect(result).toEqual({ success: true });
    await expectPasswordReset(user.id);
  });

  test('resets the password of a disabled user without enabling it', async () => {
    const user = await createTestUser(DOCUMENT_ID, { status: 'disabled' });
    signInAs(seed.adminId, 'admin');

    const result = await resetPassword({}, buildFormData(user.id));

    expect(result).toEqual({ success: true });
    const updated = await expectPasswordReset(user.id);
    expect(updated.status).toBe('disabled');
  });

  test('rejects an admin resetting their own password', async () => {
    const admin = await loadUser(seed.adminId);
    const auditLogs = await userAuditLogsFor(seed.adminId);
    signInAs(seed.adminId, 'admin');

    const result = await resetPassword({}, buildFormData(seed.adminId));

    expect(result).toEqual({
      formError: 'No podés restablecer tu propia contraseña. Cambiala desde Mi perfil.',
    });
    expect(await loadUser(seed.adminId)).toEqual(admin);
    expect(await userAuditLogsFor(seed.adminId)).toEqual(auditLogs);
  });

  test('rejects a coordinator without touching the target', async () => {
    const user = await createTestUser(DOCUMENT_ID);
    signInAs(seed.coordinatorId, 'coordinator');

    const result = await resetPassword({}, buildFormData(user.id));

    expect(result).toEqual({ formError: 'No tenés permisos para realizar esta acción.' });
    await expectUnchanged(user);
  });

  test('rejects the request when nobody is signed in', async () => {
    const user = await createTestUser(DOCUMENT_ID);

    const result = await resetPassword({}, buildFormData(user.id));

    expect(result).toEqual({ formError: 'No tenés permisos para realizar esta acción.' });
    await expectUnchanged(user);
  });

  test('rejects a deleted user', async () => {
    const user = await createTestUser(DOCUMENT_ID, { deletedAt: new Date() });
    signInAs(seed.adminId, 'admin');

    const result = await resetPassword({}, buildFormData(user.id));

    expect(result).toEqual({ formError: 'La cuenta seleccionada no existe.' });
    await expectUnchanged(user);
  });

  test('rejects a user that does not exist', async () => {
    signInAs(seed.adminId, 'admin');
    const auditCount = await prisma.auditLog.count();

    const result = await resetPassword({}, buildFormData(999_999_999));

    expect(result).toEqual({ formError: 'La cuenta seleccionada no existe.' });
    expect(await prisma.auditLog.count()).toBe(auditCount);
  });

  test('returns field errors for an invalid account and a weak password', async () => {
    const user = await createTestUser(DOCUMENT_ID);
    signInAs(seed.adminId, 'admin');

    const result = await resetPassword({}, buildFormData('abc', 'weak'));

    expect(result.errors?.userId).toEqual(['Elegí una cuenta']);
    expect(result.errors?.newPassword).toEqual([
      'La contraseña debe tener al menos 8 caracteres',
      'La contraseña debe tener al menos una mayúscula',
      'La contraseña debe tener al menos un número',
    ]);
    await expectUnchanged(user);
  });
});
