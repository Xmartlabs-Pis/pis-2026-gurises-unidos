import { beforeEach, describe, expect, test, vi } from 'vitest';
import { makeUser } from '../../fixtures/user';

const {
  authMock,
  signInMock,
  logAuditMock,
  transactionMock,
  findUniqueMock,
  hashPasswordMock,
  verifyPasswordMock,
  cookieStore,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  signInMock: vi.fn(),
  logAuditMock: vi.fn(),
  transactionMock: vi.fn(),
  findUniqueMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
  cookieStore: { set: vi.fn(), delete: vi.fn() },
}));

vi.mock('@/auth', () => ({ auth: authMock, signIn: signInMock }));
vi.mock('@/lib/audit-log', () => ({ logAudit: logAuditMock }));
vi.mock('@/lib/prisma', () => ({
  default: {
    user: { findUnique: findUniqueMock },
    $transaction: transactionMock,
  },
}));
vi.mock('@/lib/credentials', () => ({
  hashPassword: hashPasswordMock,
  verifyPassword: verifyPasswordMock,
}));
vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}));

import { AuthError } from 'next-auth';
import { redirect } from 'next/navigation';
import {
  changePassword,
  completeForcedPasswordChange,
  resetPassword,
} from '@/app/actions/password';
import {
  SESSION_EXPIRATION_COOKIE,
  SESSION_EXPIRATION_COOKIE_OPTIONS,
} from '@/lib/auth/session-expiration';

vi.mock('next-auth', () => import('@auth/core/errors'));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

function buildFormData(fields: Record<string, string | undefined>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      formData.append(key, value);
    }
  }
  return formData;
}

function setupTransaction() {
  const userUpdate = vi.fn().mockResolvedValue({});
  transactionMock.mockImplementation(async (callback) =>
    callback({ user: { update: userUpdate } })
  );
  return { userUpdate };
}

beforeEach(() => {
  authMock.mockReset();
  signInMock.mockReset();
  logAuditMock.mockReset();
  transactionMock.mockReset();
  findUniqueMock.mockReset();
  hashPasswordMock.mockReset();
  verifyPasswordMock.mockReset();
  cookieStore.set.mockReset();
  vi.mocked(redirect).mockReset();
  vi.mocked(redirect).mockImplementation(() => {
    throw new Error('NEXT_REDIRECT');
  });
});

describe('changePassword', () => {
  const VALID_FIELDS = {
    currentPassword: 'old-password',
    newPassword: 'NewPassword1',
    confirmNewPassword: 'NewPassword1',
  };

  test('rejects a new password equal to the current one', async () => {
    authMock.mockResolvedValue({ user: { id: '7', email: 'user@example.com' } });

    const result = await changePassword(
      {},
      buildFormData({
        currentPassword: 'NewPassword1',
        newPassword: 'NewPassword1',
        confirmNewPassword: 'NewPassword1',
      })
    );

    expect(result.errors?.newPassword).toEqual([
      'La nueva contraseña debe ser distinta a la actual.',
    ]);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('rejects when there is no valid session', async () => {
    authMock.mockResolvedValue(null);

    const result = await changePassword({}, buildFormData(VALID_FIELDS));

    expect(result.formError).toBe('Tu sesión ya no es válida. Iniciá sesión de nuevo.');
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('returns field errors when the new password does not meet the policy', async () => {
    authMock.mockResolvedValue({ user: { id: '7', email: 'user@example.com' } });

    const result = await changePassword(
      {},
      buildFormData({ ...VALID_FIELDS, newPassword: 'weak', confirmNewPassword: 'weak' })
    );

    expect(result.errors?.newPassword).toBeDefined();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('returns a field error when the new password and confirmation do not match', async () => {
    authMock.mockResolvedValue({ user: { id: '7', email: 'user@example.com' } });

    const result = await changePassword(
      {},
      buildFormData({ ...VALID_FIELDS, confirmNewPassword: 'SomethingElse1' })
    );

    expect(result.errors?.confirmNewPassword).toEqual(['Las contraseñas no coinciden']);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('returns a form error when the user record cannot be found', async () => {
    authMock.mockResolvedValue({ user: { id: '7', email: 'user@example.com' } });
    findUniqueMock.mockResolvedValue(null);

    const result = await changePassword({}, buildFormData(VALID_FIELDS));

    expect(result.formError).toBe('Tu sesión ya no es válida. Iniciá sesión de nuevo.');
    expect(verifyPasswordMock).not.toHaveBeenCalled();
  });

  test('returns a form error when the current password is incorrect', async () => {
    authMock.mockResolvedValue({ user: { id: '7', email: 'user@example.com' } });
    findUniqueMock.mockResolvedValue(makeUser({ id: 7 }));
    verifyPasswordMock.mockResolvedValue(false);

    const result = await changePassword({}, buildFormData(VALID_FIELDS));

    expect(result.formError).toBe('La contraseña actual es incorrecta');
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('hashes the new password, updates the user, and logs the audit trail', async () => {
    authMock.mockResolvedValue({ user: { id: '7', email: 'user@example.com' } });
    findUniqueMock.mockResolvedValue(makeUser({ id: 7 }));
    verifyPasswordMock.mockResolvedValue(true);
    hashPasswordMock.mockResolvedValue('new-hash');
    const { userUpdate } = setupTransaction();

    const result = await changePassword({}, buildFormData(VALID_FIELDS));

    expect(verifyPasswordMock).toHaveBeenCalledWith('old-password', expect.any(String));
    expect(hashPasswordMock).toHaveBeenCalledWith(VALID_FIELDS.newPassword);
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 7 },
      data: {
        passwordHash: 'new-hash',
        passwordChangedAt: expect.any(Date),
        mustChangePassword: false,
      },
    });
    expect(logAuditMock).toHaveBeenCalledWith(expect.anything(), {
      authorId: 7,
      action: 'passwordChange',
      entity: 'user',
      entityId: 7,
    });
    expect(result).toEqual({ success: true });
  });

  test('returns a form error when the transaction fails', async () => {
    authMock.mockResolvedValue({ user: { id: '7', email: 'user@example.com' } });
    findUniqueMock.mockResolvedValue(makeUser({ id: 7 }));
    verifyPasswordMock.mockResolvedValue(true);
    hashPasswordMock.mockResolvedValue('new-hash');
    transactionMock.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await changePassword({}, buildFormData(VALID_FIELDS));

    expect(result.formError).toBe('No se pudo cambiar la contraseña. Intentá de nuevo.');
  });
});

describe('completeForcedPasswordChange', () => {
  const VALID_FIELDS = {
    newPassword: 'NewPassword1',
    confirmNewPassword: 'NewPassword1',
  };

  test('signs the user back in and redirects to the dashboard after a successful change', async () => {
    const user = makeUser({ id: 7, mustChangePassword: true, documentId: '41234567' });
    authMock.mockResolvedValue({ user: { id: '7', email: 'user@example.com', remember: true } });
    findUniqueMock.mockResolvedValue(user);
    verifyPasswordMock.mockResolvedValue(false);
    hashPasswordMock.mockResolvedValue('new-hash');
    signInMock.mockResolvedValue(undefined);
    setupTransaction();

    await expect(completeForcedPasswordChange({}, buildFormData(VALID_FIELDS))).rejects.toThrow(
      'NEXT_REDIRECT'
    );

    expect(verifyPasswordMock).toHaveBeenCalledWith(VALID_FIELDS.newPassword, user.passwordHash);
    expect(signInMock).toHaveBeenCalledWith('credentials', {
      documentId: '41234567',
      password: VALID_FIELDS.newPassword,
      remember: 'true',
      redirect: false,
    });
    expect(cookieStore.set).toHaveBeenCalledWith(
      SESSION_EXPIRATION_COOKIE,
      expect.any(String),
      SESSION_EXPIRATION_COOKIE_OPTIONS
    );
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  test('falls back to login when the silent sign-in fails after the password was updated', async () => {
    authMock.mockResolvedValue({ user: { id: '7', email: 'user@example.com' } });
    findUniqueMock.mockResolvedValue(makeUser({ id: 7, mustChangePassword: true }));
    verifyPasswordMock.mockResolvedValue(false);
    hashPasswordMock.mockResolvedValue('new-hash');
    signInMock.mockRejectedValue(new AuthError());
    setupTransaction();

    await expect(completeForcedPasswordChange({}, buildFormData(VALID_FIELDS))).rejects.toThrow(
      'NEXT_REDIRECT'
    );

    expect(redirect).toHaveBeenCalledWith('/login?passwordChanged=1');
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  test('returns errors without redirecting when the change fails', async () => {
    authMock.mockResolvedValue(null);

    const result = await completeForcedPasswordChange({}, buildFormData(VALID_FIELDS));

    expect(result.formError).toBe('Tu sesión ya no es válida. Iniciá sesión de nuevo.');
    expect(redirect).not.toHaveBeenCalled();
  });

  test('rejects when the user is not required to change their password', async () => {
    authMock.mockResolvedValue({ user: { id: '7', email: 'user@example.com' } });
    findUniqueMock.mockResolvedValue(makeUser({ id: 7, mustChangePassword: false }));

    const result = await completeForcedPasswordChange({}, buildFormData(VALID_FIELDS));

    expect(result.formError).toBe('La contraseña ya fue actualizada.');
    expect(hashPasswordMock).not.toHaveBeenCalled();
    expect(signInMock).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  test('rejects when the new password matches the current temporary password', async () => {
    const user = makeUser({ id: 7, mustChangePassword: true });
    authMock.mockResolvedValue({ user: { id: '7', email: 'user@example.com' } });
    findUniqueMock.mockResolvedValue(user);
    verifyPasswordMock.mockResolvedValue(true);

    const result = await completeForcedPasswordChange({}, buildFormData(VALID_FIELDS));

    expect(result.errors?.newPassword).toEqual([
      'La nueva contraseña debe ser distinta a la actual.',
    ]);
    expect(verifyPasswordMock).toHaveBeenCalledWith(VALID_FIELDS.newPassword, user.passwordHash);
    expect(hashPasswordMock).not.toHaveBeenCalled();
    expect(signInMock).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('resetPassword', () => {
  const VALID_FIELDS = {
    userId: '9',
    newPassword: 'NewPassword1',
  };

  test('rejects when the session user is not an admin', async () => {
    authMock.mockResolvedValue({ user: { id: '1', role: 'coordinator' } });

    const result = await resetPassword({}, buildFormData(VALID_FIELDS));

    expect(result.formError).toBe('No tenés permisos para realizar esta acción.');
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('rejects when the admin tries to reset their own password', async () => {
    authMock.mockResolvedValue({ user: { id: '9', role: 'admin' } });

    const result = await resetPassword({}, buildFormData(VALID_FIELDS));

    expect(result.formError).toBe(
      'No podés restablecer tu propia contraseña. Cambiala desde Mi perfil.'
    );
    expect(findUniqueMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('rejects when there is no session', async () => {
    authMock.mockResolvedValue(null);

    const result = await resetPassword({}, buildFormData(VALID_FIELDS));

    expect(result.formError).toBe('No tenés permisos para realizar esta acción.');
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('returns field errors when the new password does not meet the policy', async () => {
    authMock.mockResolvedValue({ user: { id: '1', role: 'admin' } });

    const result = await resetPassword({}, buildFormData({ ...VALID_FIELDS, newPassword: 'weak' }));

    expect(result.errors?.newPassword).toBeDefined();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('returns a form error when the target account does not exist', async () => {
    authMock.mockResolvedValue({ user: { id: '1', role: 'admin' } });
    findUniqueMock.mockResolvedValue(null);

    const result = await resetPassword({}, buildFormData(VALID_FIELDS));

    expect(result.formError).toBe('La cuenta seleccionada no existe.');
  });

  test('returns a form error when the target account is soft-deleted', async () => {
    authMock.mockResolvedValue({ user: { id: '1', role: 'admin' } });
    findUniqueMock.mockResolvedValue(makeUser({ id: 9, deletedAt: new Date('2026-01-01') }));

    const result = await resetPassword({}, buildFormData(VALID_FIELDS));

    expect(result.formError).toBe('La cuenta seleccionada no existe.');
  });

  test('hashes the new password, forces a change on next login, and logs the admin as the author', async () => {
    authMock.mockResolvedValue({ user: { id: '1', role: 'admin' } });
    findUniqueMock.mockResolvedValue(makeUser({ id: 9 }));
    hashPasswordMock.mockResolvedValue('new-hash');
    const { userUpdate } = setupTransaction();

    const result = await resetPassword({}, buildFormData(VALID_FIELDS));

    expect(hashPasswordMock).toHaveBeenCalledWith(VALID_FIELDS.newPassword);
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 9 },
      data: {
        passwordHash: 'new-hash',
        passwordChangedAt: expect.any(Date),
        mustChangePassword: true,
      },
    });
    expect(logAuditMock).toHaveBeenCalledWith(expect.anything(), {
      authorId: 1,
      action: 'passwordReset',
      entity: 'user',
      entityId: 9,
    });
    expect(result).toEqual({ success: true });
  });

  test('allows resetting the password of a disabled account', async () => {
    authMock.mockResolvedValue({ user: { id: '1', role: 'admin' } });
    findUniqueMock.mockResolvedValue(makeUser({ id: 9, status: 'disabled' }));
    hashPasswordMock.mockResolvedValue('new-hash');
    const { userUpdate } = setupTransaction();

    const result = await resetPassword({}, buildFormData(VALID_FIELDS));

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 9 },
      data: {
        passwordHash: 'new-hash',
        passwordChangedAt: expect.any(Date),
        mustChangePassword: true,
      },
    });
    expect(result).toEqual({ success: true });
  });

  test('returns a form error when the transaction fails', async () => {
    authMock.mockResolvedValue({ user: { id: '1', role: 'admin' } });
    findUniqueMock.mockResolvedValue(makeUser({ id: 9 }));
    hashPasswordMock.mockResolvedValue('new-hash');
    transactionMock.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await resetPassword({}, buildFormData(VALID_FIELDS));

    expect(result.formError).toBe('No se pudo restablecer la contraseña. Intentá de nuevo.');
  });
});
