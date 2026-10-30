import { beforeEach, describe, expect, test, vi } from 'vitest';
import { deleteUser } from '@/app/actions/users';
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

function setupTransaction({
  target = { role: 'coordinator', deletedAt: null } as {
    role: string;
    deletedAt: Date | null;
  } | null,
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

describe('deleteUser', () => {
  test('soft deletes the user and records the deletion', async () => {
    const tx = setupTransaction();

    await expect(deleteUser(TARGET_ID)).resolves.toEqual({ success: true });

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: TARGET_ID },
      data: { deletedAt: expect.any(Date) },
    });
    expect(logAuditMock).toHaveBeenCalledWith(tx, {
      authorId: ADMIN_ID,
      action: 'deletion',
      entity: 'user',
      entityId: TARGET_ID,
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/management/users');
  });

  test('uses a serializable transaction', async () => {
    setupTransaction();

    await deleteUser(TARGET_ID);

    expect(prisma.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: 'Serializable' })
    );
  });

  test('rejects coordinators', async () => {
    requireUserMock.mockResolvedValue({ id: ADMIN_ID, role: 'coordinator', status: 'active' });

    await expect(deleteUser(TARGET_ID)).resolves.toEqual({
      error: 'No tenés permisos para realizar esta acción.',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('rejects invalid ids', async () => {
    await expect(deleteUser(-1)).resolves.toEqual({ error: 'El usuario no es válido.' });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('prevents admins from deleting themselves', async () => {
    await expect(deleteUser(ADMIN_ID)).resolves.toEqual({
      error: 'No podés darte de baja a vos mismo.',
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  test('returns an error when the user does not exist', async () => {
    const tx = setupTransaction({ target: null });

    await expect(deleteUser(TARGET_ID)).resolves.toEqual({
      error: 'El usuario no existe o ya fue dado de baja.',
    });
    expect(tx.user.update).not.toHaveBeenCalled();
  });

  test('returns an error when the user was already deleted', async () => {
    const tx = setupTransaction({ target: { role: 'coordinator', deletedAt: new Date() } });

    await expect(deleteUser(TARGET_ID)).resolves.toEqual({
      error: 'El usuario no existe o ya fue dado de baja.',
    });
    expect(tx.user.update).not.toHaveBeenCalled();
    expect(logAuditMock).not.toHaveBeenCalled();
  });

  test('deletes another admin while an active admin remains', async () => {
    const tx = setupTransaction({ target: { role: 'admin', deletedAt: null }, remainingAdmins: 1 });

    await expect(deleteUser(TARGET_ID)).resolves.toEqual({ success: true });
    expect(tx.user.count).toHaveBeenCalledWith({
      where: { role: 'admin', status: 'active', deletedAt: null, id: { not: TARGET_ID } },
    });
  });

  test('prevents deleting the last active admin', async () => {
    const tx = setupTransaction({ target: { role: 'admin', deletedAt: null }, remainingAdmins: 0 });

    await expect(deleteUser(TARGET_ID)).resolves.toEqual({
      error: 'No se puede dar de baja al último administrador activo.',
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

    await expect(deleteUser(TARGET_ID)).resolves.toEqual({
      error: 'Otra operación modificó los usuarios al mismo tiempo. Intentá de nuevo.',
    });
  });

  test('returns a generic error on unexpected failures', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.mocked(prisma.$transaction).mockRejectedValue(new Error('db down'));

    await expect(deleteUser(TARGET_ID)).resolves.toEqual({
      error: 'No se pudo dar de baja al usuario. Intentá de nuevo.',
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
    errorSpy.mockRestore();
  });
});
