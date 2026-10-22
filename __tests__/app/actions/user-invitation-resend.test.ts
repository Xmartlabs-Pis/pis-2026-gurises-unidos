import { beforeEach, describe, expect, test, vi } from 'vitest';
import { resendInvitation } from '@/app/actions/users';
import prisma from '@/lib/prisma';

const { requireUserMock, createUserTokenMock, sendInvitationEmailMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  createUserTokenMock: vi.fn(),
  sendInvitationEmailMock: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/auth/require-user', () => ({ requireUser: requireUserMock }));
vi.mock('@/lib/auth/user-tokens', () => ({ createUserToken: createUserTokenMock }));
vi.mock('@/lib/users/invitation', () => ({ sendInvitationEmail: sendInvitationEmailMock }));

const TARGET = { id: 42, firstName: 'Ana', email: 'ana@gmail.com', status: 'pendingInvitation' };

beforeEach(() => {
  requireUserMock.mockResolvedValue({ id: 7, role: 'admin', status: 'active' });
  createUserTokenMock.mockResolvedValue('new-token');
  sendInvitationEmailMock.mockReset();
  sendInvitationEmailMock.mockResolvedValue(true);
  vi.mocked(prisma.user.findUnique).mockResolvedValue(TARGET as never);
  vi.mocked(prisma.$transaction).mockImplementation((async (
    callback: (client: unknown) => unknown
  ) => callback({})) as never);
});

describe('resendInvitation', () => {
  test('creates a new invitation token and emails it', async () => {
    await expect(resendInvitation(42)).resolves.toEqual({ success: true });

    expect(createUserTokenMock).toHaveBeenCalledWith(expect.anything(), 42, 'invitation');
    expect(sendInvitationEmailMock).toHaveBeenCalledWith(TARGET, 'new-token', 7);
  });

  test('reports an error when the email could not be sent', async () => {
    sendInvitationEmailMock.mockResolvedValue(false);

    await expect(resendInvitation(42)).resolves.toEqual({
      error: 'No se pudo enviar el correo de invitación. Intentá de nuevo.',
    });
  });

  test('rejects coordinators', async () => {
    requireUserMock.mockResolvedValue({ id: 8, role: 'coordinator', status: 'active' });

    await expect(resendInvitation(42)).resolves.toEqual({
      error: 'No tenés permisos para realizar esta acción.',
    });
    expect(sendInvitationEmailMock).not.toHaveBeenCalled();
  });

  test('rejects users without a pending invitation', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue({ ...TARGET, status: 'active' } as never);

    await expect(resendInvitation(42)).resolves.toEqual({
      error: 'El usuario no tiene una invitación pendiente.',
    });
    expect(createUserTokenMock).not.toHaveBeenCalled();
  });

  test('rejects missing users', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

    await expect(resendInvitation(42)).resolves.toEqual({ error: 'El usuario no existe.' });
  });
});
