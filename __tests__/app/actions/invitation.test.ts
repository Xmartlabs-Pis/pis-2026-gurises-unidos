import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthError } from 'next-auth';
import { acceptInvitation } from '@/app/actions/invitation';
import {
  SESSION_EXPIRATION_COOKIE,
  SESSION_EXPIRATION_COOKIE_OPTIONS,
} from '@/lib/auth/session-expiration';
import prisma from '@/lib/prisma';

const {
  redirectMock,
  logAuditMock,
  hashMock,
  findValidUserTokenMock,
  consumeUserTokenMock,
  signInMock,
  cookieStore,
} = vi.hoisted(() => ({
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  logAuditMock: vi.fn(),
  hashMock: vi.fn(),
  findValidUserTokenMock: vi.fn(),
  consumeUserTokenMock: vi.fn(),
  signInMock: vi.fn(),
  cookieStore: { set: vi.fn() },
}));

vi.mock('next/navigation', () => ({ redirect: redirectMock }));
vi.mock('next/headers', () => ({ cookies: vi.fn(async () => cookieStore) }));
vi.mock('next-auth', () => import('@auth/core/errors'));
vi.mock('@/auth', () => ({ signIn: signInMock }));
vi.mock('@/lib/audit-log', () => ({ logAudit: logAuditMock }));
vi.mock('@/lib/credentials', () => ({ hashPassword: hashMock }));
vi.mock('@/lib/auth/user-tokens', () => ({
  findValidUserToken: findValidUserTokenMock,
  consumeUserToken: consumeUserTokenMock,
}));

const USER_ID = 42;
const DOCUMENT_ID = '12345672';
const TOKEN_ID = 9;

function buildFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const fields = {
    token: 'invitation-token',
    newPassword: 'NewPassword1',
    confirmNewPassword: 'NewPassword1',
    ...overrides,
  };
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

function setupTransaction({ updatedCount = 1 } = {}) {
  const tx = { user: { updateMany: vi.fn().mockResolvedValue({ count: updatedCount }) } };

  vi.mocked(prisma.$transaction).mockImplementation((async (
    callback: (client: unknown) => unknown
  ) => callback(tx)) as never);

  return tx;
}

beforeEach(() => {
  redirectMock.mockClear();
  logAuditMock.mockReset();
  signInMock.mockReset();
  cookieStore.set.mockReset();
  hashMock.mockResolvedValue('new-hash');
  consumeUserTokenMock.mockResolvedValue(true);
  findValidUserTokenMock.mockResolvedValue({
    valid: true,
    tokenId: TOKEN_ID,
    user: { id: USER_ID, documentId: DOCUMENT_ID, status: 'pendingInvitation' },
  });
});

describe('acceptInvitation', () => {
  test('activates the user with the chosen password, signs them in and redirects to the dashboard', async () => {
    const tx = setupTransaction();

    await expect(acceptInvitation({}, buildFormData())).rejects.toThrow('NEXT_REDIRECT:/dashboard');

    expect(findValidUserTokenMock).toHaveBeenCalledWith('invitation-token', 'invitation');
    expect(hashMock).toHaveBeenCalledWith('NewPassword1');
    expect(consumeUserTokenMock).toHaveBeenCalledWith(tx, TOKEN_ID);
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: USER_ID, status: 'pendingInvitation', deletedAt: null },
      data: expect.objectContaining({
        passwordHash: 'new-hash',
        mustChangePassword: false,
        status: 'active',
        passwordChangedAt: expect.any(Date),
      }),
    });
    expect(logAuditMock).toHaveBeenCalledWith(tx, {
      authorId: USER_ID,
      action: 'update',
      entity: 'user',
      entityId: USER_ID,
      details: { changes: [{ field: 'status', from: 'pendingInvitation', to: 'active' }] },
    });
    expect(signInMock).toHaveBeenCalledWith('credentials', {
      documentId: DOCUMENT_ID,
      password: 'NewPassword1',
      remember: 'false',
      redirect: false,
    });
    expect(cookieStore.set).toHaveBeenCalledWith(
      SESSION_EXPIRATION_COOKIE,
      expect.any(String),
      SESSION_EXPIRATION_COOKIE_OPTIONS
    );
  });

  test('redirects to login when the automatic sign in fails', async () => {
    setupTransaction();
    signInMock.mockRejectedValue(new AuthError('CredentialsSignin'));

    await expect(acceptInvitation({}, buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/login?invitationAccepted=1'
    );
    expect(cookieStore.set).not.toHaveBeenCalled();
  });

  test('returns field errors for an invalid password', async () => {
    const result = await acceptInvitation(
      {},
      buildFormData({ newPassword: 'weak', confirmNewPassword: 'weak' })
    );

    expect(result.errors?.newPassword).toBeDefined();
    expect(findValidUserTokenMock).not.toHaveBeenCalled();
  });

  test('rejects a missing token', async () => {
    const result = await acceptInvitation({}, buildFormData({ token: '' }));

    expect(result.formError).toBe(
      'La invitación no es válida. Pedile al administrador que te envíe una nueva.'
    );
  });

  test.each([
    ['invalid', 'La invitación no es válida. Pedile al administrador que te envíe una nueva.'],
    ['expired', 'Esta invitación venció. Pedile al administrador que te envíe una nueva.'],
    ['used', 'Esta invitación ya fue usada. Si ya completaste tu registro, iniciá sesión.'],
    [
      'replaced',
      'Esta invitación fue reemplazada por una más nueva. Usá el enlace del último correo.',
    ],
  ])('reports a %s invitation', async (reason, message) => {
    findValidUserTokenMock.mockResolvedValue({ valid: false, reason });

    await expect(acceptInvitation({}, buildFormData())).resolves.toEqual({ formError: message });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('rejects the invitation when the user is no longer pending', async () => {
    findValidUserTokenMock.mockResolvedValue({
      valid: true,
      tokenId: TOKEN_ID,
      user: { id: USER_ID, status: 'active' },
    });

    const result = await acceptInvitation({}, buildFormData());

    expect(result.formError).toBe(
      'Esta invitación ya fue usada. Si ya completaste tu registro, iniciá sesión.'
    );
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('reports the invitation as used when another request consumed it first', async () => {
    const tx = setupTransaction();
    consumeUserTokenMock.mockResolvedValue(false);
    findValidUserTokenMock
      .mockResolvedValueOnce({
        valid: true,
        tokenId: TOKEN_ID,
        user: { id: USER_ID, status: 'pendingInvitation' },
      })
      .mockResolvedValueOnce({ valid: false, reason: 'used' });

    const result = await acceptInvitation({}, buildFormData());

    expect(result.formError).toBe(
      'Esta invitación ya fue usada. Si ya completaste tu registro, iniciá sesión.'
    );
    expect(tx.user.updateMany).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  test('reports the invitation as replaced when a newer one was sent during the request', async () => {
    setupTransaction();
    consumeUserTokenMock.mockResolvedValue(false);
    findValidUserTokenMock
      .mockResolvedValueOnce({
        valid: true,
        tokenId: TOKEN_ID,
        user: { id: USER_ID, status: 'pendingInvitation' },
      })
      .mockResolvedValueOnce({ valid: false, reason: 'replaced' });

    const result = await acceptInvitation({}, buildFormData());

    expect(result.formError).toBe(
      'Esta invitación fue reemplazada por una más nueva. Usá el enlace del último correo.'
    );
  });

  test('does not activate a user that stopped being pending during the request', async () => {
    setupTransaction({ updatedCount: 0 });

    const result = await acceptInvitation({}, buildFormData());

    expect(result.formError).toBe(
      'La invitación no es válida. Pedile al administrador que te envíe una nueva.'
    );
    expect(logAuditMock).not.toHaveBeenCalled();
  });
});
