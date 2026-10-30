import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Prisma } from '@/generated/prisma/client';
import type { ProfileFormState } from '@/lib/validation/profile';

const { authMock, logAuditMock, revalidatePathMock, transactionMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  logAuditMock: vi.fn(),
  revalidatePathMock: vi.fn(),
  transactionMock: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('@/lib/audit-log', () => ({ logAudit: logAuditMock }));
vi.mock('next/cache', () => ({ revalidatePath: revalidatePathMock }));
vi.mock('@/lib/prisma', () => ({ default: { $transaction: transactionMock } }));

import { updateProfile } from '@/app/actions/profile';

const EMPTY_STATE: ProfileFormState = {};

function buildFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const fields = {
    firstName: 'Ana',
    lastName: 'García',
    email: 'ana@example.com',
    ...overrides,
  };

  for (const [key, value] of Object.entries(fields)) {
    formData.set(key, value);
  }

  return formData;
}

function setupTransaction({ userId = 7 } = {}) {
  const userFindFirst = vi.fn().mockResolvedValue({
    id: userId,
    firstName: 'Ana',
    lastName: 'Previous',
    email: 'ana@example.com',
  });
  const userUpdate = vi.fn().mockImplementation(({ data }) =>
    Promise.resolve({
      id: userId,
      firstName: data.firstName,
      lastName: data.lastName,
      email: data.email,
    })
  );

  transactionMock.mockImplementation(async (callback) =>
    callback({ user: { findFirst: userFindFirst, update: userUpdate } })
  );

  return { userFindFirst, userUpdate };
}

function knownRequestError(code: string, meta: Record<string, unknown> = {}) {
  return new Prisma.PrismaClientKnownRequestError('Prisma request failed', {
    code,
    clientVersion: '6.19.3',
    meta,
  });
}

beforeEach(() => {
  authMock.mockReset();
  logAuditMock.mockReset();
  revalidatePathMock.mockReset();
  transactionMock.mockReset();
  authMock.mockResolvedValue({ user: { id: '7', role: 'coordinator' } });
});

describe('updateProfile', () => {
  test.each([null, { user: {} }, { user: { id: 'invalid' } }])(
    'rejects an invalid session without accessing the database',
    async (session) => {
      authMock.mockResolvedValue(session);

      await expect(updateProfile(EMPTY_STATE, buildFormData())).resolves.toEqual({
        formError: 'Tu sesión ya no es válida. Iniciá sesión de nuevo.',
      });
      expect(transactionMock).not.toHaveBeenCalled();
    }
  );

  test('returns validation errors without accessing the database', async () => {
    const result = await updateProfile(
      EMPTY_STATE,
      buildFormData({ firstName: '', lastName: '', email: 'not-an-email' })
    );

    expect(result.errors?.firstName).toContain('El nombre es obligatorio.');
    expect(result.errors?.lastName).toContain('El apellido es obligatorio.');
    expect(result.errors?.email).toContain('Ingresá un correo electrónico válido.');
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('updates the authenticated user and records the audit event atomically', async () => {
    const { userFindFirst, userUpdate } = setupTransaction();

    const result = await updateProfile(EMPTY_STATE, buildFormData());

    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function));
    expect(userFindFirst).toHaveBeenCalledWith({
      where: {
        id: 7,
        status: 'active',
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: {
        id: 7,
        status: 'active',
        deletedAt: null,
      },
      data: {
        firstName: 'Ana',
        lastName: 'García',
        email: 'ana@example.com',
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });
    expect(logAuditMock).toHaveBeenCalledWith(expect.anything(), {
      authorId: 7,
      action: 'update',
      entity: 'user',
      entityId: 7,
      details: { changedFields: ['lastName'] },
    });
    expect(revalidatePathMock).toHaveBeenCalledWith('/management/profile');
    expect(result).toEqual({
      success: true,
      values: {
        firstName: 'Ana',
        lastName: 'García',
        email: 'ana@example.com',
      },
    });
  });

  test('returns success without updating or auditing when the profile is unchanged', async () => {
    const { userFindFirst, userUpdate } = setupTransaction();
    userFindFirst.mockResolvedValue({
      id: 7,
      firstName: 'Ana',
      lastName: 'García',
      email: 'ana@example.com',
    });

    await expect(
      updateProfile(
        EMPTY_STATE,
        buildFormData({
          firstName: ' Ana ',
          lastName: ' García ',
          email: ' ANA@EXAMPLE.COM ',
        })
      )
    ).resolves.toEqual({
      success: true,
      values: {
        firstName: 'Ana',
        lastName: 'García',
        email: 'ana@example.com',
      },
    });
    expect(userUpdate).not.toHaveBeenCalled();
    expect(logAuditMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test('returns a session error without writing when the active profile no longer exists', async () => {
    const { userFindFirst, userUpdate } = setupTransaction();
    userFindFirst.mockResolvedValue(null);

    await expect(updateProfile(EMPTY_STATE, buildFormData())).resolves.toEqual({
      formError: 'Tu sesión ya no es válida. Iniciá sesión de nuevo.',
    });
    expect(userUpdate).not.toHaveBeenCalled();
    expect(logAuditMock).not.toHaveBeenCalled();
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test('normalizes the editable fields before updating', async () => {
    const { userUpdate } = setupTransaction();

    await updateProfile(
      EMPTY_STATE,
      buildFormData({
        firstName: ' Ana ',
        lastName: ' García ',
        email: ' ANA@EXAMPLE.COM ',
      })
    );

    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          firstName: 'Ana',
          lastName: 'García',
          email: 'ana@example.com',
        },
      })
    );
  });

  test('ignores attempts to update identity, role, status, password, or another user', async () => {
    const { userUpdate } = setupTransaction();
    const formData = buildFormData({
      userId: '99',
      documentId: '12345678',
      role: 'admin',
      status: 'disabled',
      password: 'ChangedPassword1',
    });

    await updateProfile(EMPTY_STATE, formData);

    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 7 }),
        data: {
          firstName: 'Ana',
          lastName: 'García',
          email: 'ana@example.com',
        },
      })
    );
  });

  test('allows an administrator to update their own profile without admin-only fields', async () => {
    authMock.mockResolvedValue({ user: { id: '11', role: 'admin' } });
    const { userUpdate } = setupTransaction({ userId: 11 });

    await updateProfile(EMPTY_STATE, buildFormData());

    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ id: 11 }) })
    );
    expect(logAuditMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ authorId: 11, entityId: 11 })
    );
  });

  test('returns a field error when the email is already in use', async () => {
    transactionMock.mockRejectedValue(knownRequestError('P2002', { target: ['email'] }));

    await expect(updateProfile(EMPTY_STATE, buildFormData())).resolves.toEqual({
      errors: { email: ['Ya existe un usuario con ese correo electrónico.'] },
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test.each(['P2003', 'P2025'])('returns a session error for Prisma error %s', async (code) => {
    transactionMock.mockRejectedValue(knownRequestError(code));

    await expect(updateProfile(EMPTY_STATE, buildFormData())).resolves.toEqual({
      formError: 'Tu sesión ya no es válida. Iniciá sesión de nuevo.',
    });
    expect(revalidatePathMock).not.toHaveBeenCalled();
  });

  test('returns a generic error when the transaction fails', async () => {
    const failure = new Error('database unavailable');
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    transactionMock.mockRejectedValue(failure);

    await expect(updateProfile(EMPTY_STATE, buildFormData())).resolves.toEqual({
      formError: 'No se pudo actualizar tu perfil. Intentá de nuevo.',
    });
    expect(errorSpy).toHaveBeenCalledWith('Failed to update profile', failure);

    errorSpy.mockRestore();
  });
});
