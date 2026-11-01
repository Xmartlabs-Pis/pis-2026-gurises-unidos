import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { makeUser } from '../../fixtures/user';

const {
  afterCallbacks,
  findUniqueMock,
  transactionMock,
  sendEmailMock,
  createUserTokenMock,
  findValidUserTokenMock,
  consumeUserTokenMock,
  hashPasswordMock,
  verifyPasswordMock,
  logAuditMock,
} = vi.hoisted(() => ({
  afterCallbacks: [] as Array<() => Promise<void>>,
  findUniqueMock: vi.fn(),
  transactionMock: vi.fn(),
  sendEmailMock: vi.fn(),
  createUserTokenMock: vi.fn(),
  findValidUserTokenMock: vi.fn(),
  consumeUserTokenMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  verifyPasswordMock: vi.fn(),
  logAuditMock: vi.fn(),
}));

vi.mock('next/server', () => ({
  after: (callback: () => Promise<void>) => {
    afterCallbacks.push(callback);
  },
}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/prisma', () => ({
  default: { user: { findUnique: findUniqueMock }, $transaction: transactionMock },
}));
vi.mock('@/lib/email/client', () => ({ sendEmail: sendEmailMock }));
vi.mock('@/lib/audit-log', () => ({ logAudit: logAuditMock }));
vi.mock('@/lib/credentials', () => ({
  hashPassword: hashPasswordMock,
  verifyPassword: verifyPasswordMock,
}));
vi.mock('@/lib/auth/user-tokens', () => ({
  PASSWORD_RESET_TOKEN_TTL_MINUTES: 60,
  createUserToken: createUserTokenMock,
  findValidUserToken: findValidUserTokenMock,
  consumeUserToken: consumeUserTokenMock,
}));

import { redirect } from 'next/navigation';
import { requestPasswordReset, resetPasswordWithToken } from '@/app/actions/password-recovery';
import { RESET_TOKEN_ERROR_MESSAGES } from '@/lib/auth/password-reset';

function buildFormData(fields: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value);
  }
  return formData;
}

async function runAfterCallbacks() {
  for (const callback of afterCallbacks.splice(0)) {
    await callback();
  }
}

function setupTransaction(updatedUsers = 1) {
  const tx = {
    user: { updateMany: vi.fn().mockResolvedValue({ count: updatedUsers }) },
    loginThrottle: { deleteMany: vi.fn().mockResolvedValue({ count: 1 }) },
  };
  transactionMock.mockImplementation(async (callback) => callback(tx));
  return tx;
}

beforeEach(() => {
  afterCallbacks.length = 0;
  vi.clearAllMocks();
  vi.mocked(redirect).mockImplementation(() => {
    throw new Error('NEXT_REDIRECT');
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('requestPasswordReset', () => {
  test('returns field errors for an invalid email without looking up users', async () => {
    const result = await requestPasswordReset({}, buildFormData({ email: 'not-an-email' }));

    expect(result.errors?.email).toBeDefined();
    expect(findUniqueMock).not.toHaveBeenCalled();
  });

  test('looks up only active, non-deleted users by normalized email', async () => {
    findUniqueMock.mockResolvedValue(null);

    await requestPasswordReset({}, buildFormData({ email: '  Ana@Example.com ' }));

    expect(findUniqueMock).toHaveBeenCalledWith({
      where: { email: 'ana@example.com', deletedAt: null, status: 'active' },
    });
  });

  test('returns the same response whether the email exists or not', async () => {
    findUniqueMock.mockResolvedValueOnce(makeUser({ id: 7 })).mockResolvedValueOnce(null);

    const existing = await requestPasswordReset({}, buildFormData({ email: 'user7@example.com' }));
    const missing = await requestPasswordReset({}, buildFormData({ email: 'nobody@example.com' }));

    expect(existing).toEqual({ success: true });
    expect(missing).toEqual(existing);
  });

  test('does not create a token or send an email when no eligible user matches', async () => {
    findUniqueMock.mockResolvedValue(null);

    await requestPasswordReset({}, buildFormData({ email: 'nobody@example.com' }));

    expect(afterCallbacks).toHaveLength(0);
    expect(transactionMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('sends the reset link after responding when the user exists', async () => {
    vi.stubEnv('AUTH_URL', 'http://159.89.90.10:3001');
    const user = makeUser({ id: 7, email: 'user7@example.com' });
    findUniqueMock.mockResolvedValue(user);
    transactionMock.mockImplementation(async (callback) => callback({}));
    createUserTokenMock.mockResolvedValue('raw-token');

    await requestPasswordReset({}, buildFormData({ email: user.email }));

    expect(sendEmailMock).not.toHaveBeenCalled();

    await runAfterCallbacks();

    expect(createUserTokenMock).toHaveBeenCalledWith({}, 7, 'passwordReset');
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const { to, react } = sendEmailMock.mock.calls[0][0];
    expect(to).toBe('user7@example.com');
    expect(react.props.resetUrl).toBe('http://159.89.90.10:3001/reset-password?token=raw-token');
    expect(react.props.expiresInMinutes).toBe(60);
  });

  test.each(['http://159.89.90.10:3001/', 'http://159.89.90.10:3001/api/auth'])(
    'builds the reset link from the origin of AUTH_URL %s',
    async (authUrl) => {
      vi.stubEnv('AUTH_URL', authUrl);
      findUniqueMock.mockResolvedValue(makeUser({ id: 7 }));
      transactionMock.mockImplementation(async (callback) => callback({}));
      createUserTokenMock.mockResolvedValue('raw-token');

      await requestPasswordReset({}, buildFormData({ email: 'user7@example.com' }));
      await runAfterCallbacks();

      expect(sendEmailMock.mock.calls[0][0].react.props.resetUrl).toBe(
        'http://159.89.90.10:3001/reset-password?token=raw-token'
      );
    }
  );

  test('falls back to localhost outside production when AUTH_URL is not set', async () => {
    vi.stubEnv('AUTH_URL', '');
    vi.stubEnv('NODE_ENV', 'development');
    findUniqueMock.mockResolvedValue(makeUser({ id: 7 }));
    transactionMock.mockImplementation(async (callback) => callback({}));
    createUserTokenMock.mockResolvedValue('raw-token');

    await requestPasswordReset({}, buildFormData({ email: 'user7@example.com' }));
    await runAfterCallbacks();

    expect(sendEmailMock.mock.calls[0][0].react.props.resetUrl).toBe(
      'http://localhost:3000/reset-password?token=raw-token'
    );
  });

  test('logs an error and sends nothing in production when AUTH_URL is not set', async () => {
    vi.stubEnv('AUTH_URL', '');
    vi.stubEnv('NODE_ENV', 'production');
    findUniqueMock.mockResolvedValue(makeUser({ id: 7 }));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await requestPasswordReset({}, buildFormData({ email: 'user7@example.com' }));
    await runAfterCallbacks();

    expect(result).toEqual({ success: true });
    expect(consoleError).toHaveBeenCalledWith(
      'Failed to send password reset email',
      expect.objectContaining({ message: 'AUTH_URL is not set' })
    );
    expect(createUserTokenMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  test('logs and swallows failures while sending the email', async () => {
    findUniqueMock.mockResolvedValue(makeUser({ id: 7 }));
    transactionMock.mockRejectedValue(new Error('db down'));
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await requestPasswordReset({}, buildFormData({ email: 'user7@example.com' }));
    await runAfterCallbacks();

    expect(result).toEqual({ success: true });
    expect(consoleError).toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });
});

describe('resetPasswordWithToken', () => {
  const VALID_FIELDS = {
    token: 'raw-token',
    newPassword: 'NewPassword1',
    confirmNewPassword: 'NewPassword1',
  };

  test('returns the invalid link message when the token is missing', async () => {
    const result = await resetPasswordWithToken(
      {},
      buildFormData({ newPassword: 'NewPassword1', confirmNewPassword: 'NewPassword1' })
    );

    expect(result).toEqual({ formError: RESET_TOKEN_ERROR_MESSAGES.invalid });
    expect(findValidUserTokenMock).not.toHaveBeenCalled();
  });

  test('returns field errors when the new password does not meet the policy', async () => {
    const result = await resetPasswordWithToken(
      {},
      buildFormData({ ...VALID_FIELDS, newPassword: 'weak', confirmNewPassword: 'weak' })
    );

    expect(result.errors?.newPassword).toBeDefined();
    expect(findValidUserTokenMock).not.toHaveBeenCalled();
  });

  test.each(['invalid', 'used', 'expired', 'replaced'] as const)(
    'returns the %s message when the token cannot be used',
    async (reason) => {
      findValidUserTokenMock.mockResolvedValue({ valid: false, reason });

      const result = await resetPasswordWithToken({}, buildFormData(VALID_FIELDS));

      expect(result).toEqual({ formError: RESET_TOKEN_ERROR_MESSAGES[reason] });
      expect(transactionMock).not.toHaveBeenCalled();
    }
  );

  test('rejects tokens of users that are not active', async () => {
    findValidUserTokenMock.mockResolvedValue({
      valid: true,
      tokenId: 5,
      user: makeUser({ id: 7, status: 'disabled' }),
    });

    const result = await resetPasswordWithToken({}, buildFormData(VALID_FIELDS));

    expect(result).toEqual({ formError: RESET_TOKEN_ERROR_MESSAGES.invalid });
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('rejects a new password equal to the current one', async () => {
    const user = makeUser({ id: 7 });
    findValidUserTokenMock.mockResolvedValue({ valid: true, tokenId: 5, user });
    verifyPasswordMock.mockResolvedValue(true);

    const result = await resetPasswordWithToken({}, buildFormData(VALID_FIELDS));

    expect(verifyPasswordMock).toHaveBeenCalledWith('NewPassword1', user.passwordHash);
    expect(result.errors?.newPassword).toEqual([
      'La nueva contraseña debe ser distinta a la actual.',
    ]);
    expect(hashPasswordMock).not.toHaveBeenCalled();
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('updates the password, consumes the token, logs the audit and redirects to login', async () => {
    findValidUserTokenMock.mockResolvedValue({
      valid: true,
      tokenId: 5,
      user: makeUser({ id: 7 }),
    });
    verifyPasswordMock.mockResolvedValue(false);
    hashPasswordMock.mockResolvedValue('new-hash');
    consumeUserTokenMock.mockResolvedValue(true);
    const tx = setupTransaction();

    await expect(resetPasswordWithToken({}, buildFormData(VALID_FIELDS))).rejects.toThrow(
      'NEXT_REDIRECT'
    );

    expect(consumeUserTokenMock).toHaveBeenCalledWith(tx, 5);
    expect(tx.loginThrottle.deleteMany).toHaveBeenCalledWith({
      where: { documentId: makeUser({ id: 7 }).documentId },
    });
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: 7, status: 'active', deletedAt: null },
      data: {
        passwordHash: 'new-hash',
        passwordChangedAt: expect.any(Date),
        mustChangePassword: false,
      },
    });
    expect(logAuditMock).toHaveBeenCalledWith(tx, {
      authorId: 7,
      action: 'passwordReset',
      entity: 'user',
      entityId: 7,
      details: { method: 'email' },
    });
    expect(redirect).toHaveBeenCalledWith('/login?passwordChanged=1');
  });

  test('reports the current reason when the token stopped being usable before consuming it', async () => {
    findValidUserTokenMock
      .mockResolvedValueOnce({ valid: true, tokenId: 5, user: makeUser({ id: 7 }) })
      .mockResolvedValueOnce({ valid: false, reason: 'expired' });
    verifyPasswordMock.mockResolvedValue(false);
    hashPasswordMock.mockResolvedValue('new-hash');
    consumeUserTokenMock.mockResolvedValue(false);
    const tx = setupTransaction();

    const result = await resetPasswordWithToken({}, buildFormData(VALID_FIELDS));

    expect(result).toEqual({ formError: RESET_TOKEN_ERROR_MESSAGES.expired });
    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(tx.loginThrottle.deleteMany).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  test('falls back to the used message when the token still looks valid after a failed consume', async () => {
    const lookup = { valid: true, tokenId: 5, user: makeUser({ id: 7 }) };
    findValidUserTokenMock.mockResolvedValue(lookup);
    verifyPasswordMock.mockResolvedValue(false);
    hashPasswordMock.mockResolvedValue('new-hash');
    consumeUserTokenMock.mockResolvedValue(false);
    setupTransaction();

    const result = await resetPasswordWithToken({}, buildFormData(VALID_FIELDS));

    expect(result).toEqual({ formError: RESET_TOKEN_ERROR_MESSAGES.used });
  });

  test('does not change the password when the user was disabled after validating the token', async () => {
    findValidUserTokenMock.mockResolvedValue({
      valid: true,
      tokenId: 5,
      user: makeUser({ id: 7 }),
    });
    verifyPasswordMock.mockResolvedValue(false);
    hashPasswordMock.mockResolvedValue('new-hash');
    consumeUserTokenMock.mockResolvedValue(true);
    setupTransaction(0);

    const result = await resetPasswordWithToken({}, buildFormData(VALID_FIELDS));

    expect(result).toEqual({ formError: RESET_TOKEN_ERROR_MESSAGES.invalid });
    expect(logAuditMock).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  test('returns a form error when the transaction fails', async () => {
    findValidUserTokenMock.mockResolvedValue({
      valid: true,
      tokenId: 5,
      user: makeUser({ id: 7 }),
    });
    verifyPasswordMock.mockResolvedValue(false);
    hashPasswordMock.mockResolvedValue('new-hash');
    transactionMock.mockRejectedValue(new Error('db down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await resetPasswordWithToken({}, buildFormData(VALID_FIELDS));

    expect(result.formError).toBe('No se pudo restablecer la contraseña. Intentá de nuevo.');
    expect(redirect).not.toHaveBeenCalled();
  });
});
