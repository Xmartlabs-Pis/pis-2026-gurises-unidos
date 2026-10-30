import { beforeEach, describe, expect, test, vi } from 'vitest';
import { updateUserStatus } from '@/app/actions/users';
import { Prisma } from '@/generated/prisma/client';
import prisma from '@/lib/prisma';

const { requireUserMock, logAuditMock, revalidatePathMock } = vi.hoisted(() => ({
  requireUserMock: vi.fn(),
  logAuditMock: vi.fn(),
  revalidatePathMock: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/auth/require-user', () => ({ requireUser: requireUserMock }));
vi.mock('@/lib/audit-log', () => ({ logAudit: logAuditMock }));
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));

const ADMIN_ID = 7;
const TARGET_ID = 42;

type Target = { role: string; status: string } | null;

function setupTransaction({
  target = { role: 'coordinator', status: 'active' } as Target,
  remainingAdmins = 1,
} = {}) {
  const tx = {
    user: {
      findUnique: vi.fn().mockResolvedValue(target),
      count: vi.fn().mockResolvedValue(remainingAdmins),
      update: vi.fn().mockResolvedValue({ id: TARGET_ID }),
    },
  };

  vi.mocked(prisma.$transaction).mockImplementation((async (
    callback: (client: unknown) => unknown
  ) => callback(tx)) as never);

  return tx;
}

beforeEach(() => {
  requireUserMock.mockResolvedValue({ id: ADMIN_ID, role: 'admin', status: 'active' });
  logAuditMock.mockReset();
  revalidatePathMock.mockReset();
});

describe('updateUserStatus', () => {
  test('disables the user and records the change', async () => {
    const tx = setupTransaction();

    await expect(updateUserStatus(TARGET_ID, 'disabled')).resolves.toEqual({ success: true });

    expect(tx.user.findUnique).toHaveBeenCalledWith({
      where: { id: TARGET_ID, deletedAt: null },
      select: { role: true, status: true },
    });
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: TARGET_ID },
      data: { status: 'disabled' },
    });
    expect(logAuditMock).toHaveBeenCalledWith(tx, {
      authorId: ADMIN_ID,
      action: 'update',
      entity: 'user',
      entityId: TARGET_ID,
      details: { changes: [{ field: 'status', from: 'active', to: 'disabled' }] },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/management/users');
  });

  test('enables a disabled user without checking remaining admins', async () => {
    const tx = setupTransaction({ target: { role: 'admin', status: 'disabled' } });

    await expect(updateUserStatus(TARGET_ID, 'active')).resolves.toEqual({ success: true });

    expect(tx.user.count).not.toHaveBeenCalled();
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: TARGET_ID },
      data: { status: 'active' },
    });
    expect(logAuditMock).toHaveBeenCalledWith(
      tx,
      expect.objectContaining({
        details: { changes: [{ field: 'status', from: 'disabled', to: 'active' }] },
      })
    );
  });

  test('uses a serializable transaction', async () => {
    setupTransaction();

    await updateUserStatus(TARGET_ID, 'disabled');

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: 'Serializable' })
    );
  });

  test('rejects coordinators', async () => {
    requireUserMock.mockResolvedValue({ id: ADMIN_ID, role: 'coordinator', status: 'active' });

    await expect(updateUserStatus(TARGET_ID, 'disabled')).resolves.toEqual({
      error: 'No tenés permisos para realizar esta acción.',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('rejects invalid ids', async () => {
    await expect(updateUserStatus(-1, 'disabled')).resolves.toEqual({
      error: 'El usuario no es válido.',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('rejects statuses other than active or disabled', async () => {
    await expect(updateUserStatus(TARGET_ID, 'pendingInvitation' as never)).resolves.toEqual({
      error: 'El usuario no es válido.',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('prevents admins from changing their own status', async () => {
    await expect(updateUserStatus(ADMIN_ID, 'disabled')).resolves.toEqual({
      error: 'No podés cambiar tu propio estado.',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('returns an error when the user does not exist or was deleted', async () => {
    const tx = setupTransaction({ target: null });

    await expect(updateUserStatus(TARGET_ID, 'disabled')).resolves.toEqual({
      error: 'El usuario no existe.',
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  test('returns an error when the user is already disabled', async () => {
    const tx = setupTransaction({ target: { role: 'coordinator', status: 'disabled' } });

    await expect(updateUserStatus(TARGET_ID, 'disabled')).resolves.toEqual({
      error: 'El usuario ya está deshabilitado.',
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(logAuditMock).not.toHaveBeenCalled();
  });

  test('prevents disabling a user with a pending invitation', async () => {
    const tx = setupTransaction({ target: { role: 'coordinator', status: 'pendingInvitation' } });

    await expect(updateUserStatus(TARGET_ID, 'disabled')).resolves.toEqual({
      error: 'No se puede deshabilitar a un usuario con invitación pendiente.',
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(logAuditMock).not.toHaveBeenCalled();
  });

  test('returns an error when enabling a user that is not disabled', async () => {
    const tx = setupTransaction({ target: { role: 'coordinator', status: 'active' } });

    await expect(updateUserStatus(TARGET_ID, 'active')).resolves.toEqual({
      error: 'El usuario ya está habilitado.',
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  test('disables another admin while an active admin remains', async () => {
    const tx = setupTransaction({
      target: { role: 'admin', status: 'active' },
      remainingAdmins: 1,
    });

    await expect(updateUserStatus(TARGET_ID, 'disabled')).resolves.toEqual({ success: true });
    expect(tx.user.count).toHaveBeenCalledWith({
      where: { role: 'admin', status: 'active', deletedAt: null, id: { not: TARGET_ID } },
    });
  });

  test('prevents disabling the last active admin', async () => {
    const tx = setupTransaction({
      target: { role: 'admin', status: 'active' },
      remainingAdmins: 0,
    });

    await expect(updateUserStatus(TARGET_ID, 'disabled')).resolves.toEqual({
      error: 'No se puede deshabilitar al último administrador activo.',
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test('asks to retry on a serialization conflict', async () => {
    vi.mocked(prisma.$transaction).mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Transaction failed', {
        code: 'P2034',
        clientVersion: '6.19.3',
      })
    );

    await expect(updateUserStatus(TARGET_ID, 'disabled')).resolves.toEqual({
      error: 'Otra operación modificó los usuarios al mismo tiempo. Intentá de nuevo.',
    });
  });

  test('returns a generic error on unexpected failures', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('db down'));

    await expect(updateUserStatus(TARGET_ID, 'disabled')).resolves.toEqual({
      error: 'No se pudo cambiar el estado del usuario. Intentá de nuevo.',
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
