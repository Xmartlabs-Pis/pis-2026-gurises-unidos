import { beforeEach, describe, expect, test, vi } from 'vitest';
import { updateUser } from '@/app/actions/users';
import { Prisma } from '@/generated/prisma/client';
import type { UserFormState } from '@/lib/validation/user';

const { requireUserMock, redirectMock, revalidatePathMock, logAuditMock, transactionMock } =
  vi.hoisted(() => ({
    requireUserMock: vi.fn(),
    redirectMock: vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    }),
    revalidatePathMock: vi.fn(),
    logAuditMock: vi.fn(),
    transactionMock: vi.fn(),
  }));

vi.mock('@/auth', () => ({ auth: vi.fn() }));
vi.mock('@/lib/auth/require-user', () => ({ requireUser: requireUserMock }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('@/lib/audit-log', () => ({ logAudit: logAuditMock }));
vi.mock('@/lib/prisma', () => ({ default: { $transaction: transactionMock } }));

const ADMIN_ID = 7;
const TARGET_ID = 42;
const EMPTY_STATE: UserFormState = {};

const CURRENT_USER = {
  firstName: 'Ana',
  lastName: 'García',
  documentId: '77777777',
  email: 'ana@gmail.com',
  role: 'coordinator',
  status: 'active',
};

function buildFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  for (const [key, value] of Object.entries({ ...CURRENT_USER, ...overrides })) {
    formData.set(key, value);
  }
  return formData;
}

function setupTransaction({ target = CURRENT_USER, remainingAdmins = 1 } = {}) {
  const tx = {
    user: {
      findUnique: vi.fn().mockResolvedValue(target),
      count: vi.fn().mockResolvedValue(remainingAdmins),
      update: vi.fn().mockResolvedValue({ id: TARGET_ID }),
    },
  };

  transactionMock.mockImplementation(async (callback) => callback(tx));

  return tx;
}

function duplicateError(field: string) {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '6.19.3',
    meta: { target: [field] },
  });
}

beforeEach(() => {
  requireUserMock.mockResolvedValue({ id: ADMIN_ID, role: 'admin', status: 'active' });
  transactionMock.mockReset();
  logAuditMock.mockReset();
  revalidatePathMock.mockReset();
});

describe('updateUser', () => {
  test('saves the changes and records them', async () => {
    const tx = setupTransaction();

    await expect(
      updateUser(TARGET_ID, EMPTY_STATE, buildFormData({ firstName: 'Ana María' }))
    ).rejects.toThrow('NEXT_REDIRECT:/management/users');

    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: TARGET_ID },
      data: expect.objectContaining({ firstName: 'Ana María' }),
    });
    expect(logAuditMock).toHaveBeenCalledWith(tx, {
      authorId: ADMIN_ID,
      action: 'update',
      entity: 'user',
      entityId: TARGET_ID,
      details: { changedFields: ['firstName'] },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/management/users');
  });

  test('redirects without saving when nothing changed', async () => {
    const tx = setupTransaction();

    await expect(updateUser(TARGET_ID, EMPTY_STATE, buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/management/users'
    );

    expect(tx.user.update).not.toHaveBeenCalled();
    expect(logAuditMock).not.toHaveBeenCalled();
  });

  test('rejects an empty required field without touching the database', async () => {
    const result = await updateUser(TARGET_ID, EMPTY_STATE, buildFormData({ firstName: '' }));

    expect(result.errors?.firstName).toEqual(['El nombre es obligatorio.']);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('returns an error when the email belongs to another user', async () => {
    transactionMock.mockRejectedValue(duplicateError('email'));

    const result = await updateUser(TARGET_ID, EMPTY_STATE, buildFormData());

    expect(result.formError).toBe('Ya existe un usuario con ese correo electrónico.');
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test('returns an error when the document belongs to another user', async () => {
    transactionMock.mockRejectedValue(duplicateError('documentId'));

    const result = await updateUser(TARGET_ID, EMPTY_STATE, buildFormData());

    expect(result.formError).toBe('Ya existe un usuario con ese documento.');
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test('rejects coordinators', async () => {
    requireUserMock.mockResolvedValue({ id: ADMIN_ID, role: 'coordinator', status: 'active' });

    const result = await updateUser(TARGET_ID, EMPTY_STATE, buildFormData());

    expect(result.formError).toBe('No tenés permisos para realizar esta acción.');
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('prevents demoting the last active admin', async () => {
    const tx = setupTransaction({
      target: { ...CURRENT_USER, role: 'admin' },
      remainingAdmins: 0,
    });

    const result = await updateUser(TARGET_ID, EMPTY_STATE, buildFormData({ role: 'coordinator' }));

    expect(result.formError).toBe('No se puede cambiar el rol del último administrador activo.');
    expect(tx.user.update).not.toHaveBeenCalled();
  });
});
