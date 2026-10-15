import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { UserFormState } from '@/lib/validation/user';
import { createUser } from '@/app/actions/users';
import { generateTemporaryPassword } from '@/lib/users';
import { Prisma } from '@/generated/prisma/client';

const { authMock, redirectMock, logAuditMock, transactionMock, hashMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  logAuditMock: vi.fn(),
  transactionMock: vi.fn(),
  hashMock: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/audit-log', () => ({ logAudit: logAuditMock }));
vi.mock('bcryptjs', () => ({ default: { hash: hashMock } }));
vi.mock('@/lib/prisma', () => ({ default: { $transaction: transactionMock } }));

const EMPTY_STATE: UserFormState = {};

const SUBMITTED_VALUES = {
  firstName: 'Ana',
  lastName: 'García',
  documentId: '77777777',
  email: 'ana@gmail.com',
  role: 'coordinator',
};

function buildFormData(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  const fields = {
    firstName: 'Ana',
    lastName: 'García',
    documentId: '77777777',
    email: 'ana@gmail.com',
    role: 'coordinator',
    status: 'active',
    password: 'Test1234',
    ...overrides,
  };

  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

function setupTransaction({ userId = 42, deletedUserId = null as number | null } = {}) {
  const userCreate = vi.fn().mockResolvedValue({ id: userId });
  const userUpdate = vi.fn().mockResolvedValue({ id: deletedUserId });
  const userFindFirst = vi
    .fn()
    .mockResolvedValue(deletedUserId === null ? null : { id: deletedUserId });

  transactionMock.mockImplementation(async (callback) =>
    callback({
      user: { create: userCreate, update: userUpdate, findFirst: userFindFirst },
    })
  );

  return { userCreate, userUpdate };
}

function knownRequestError(code: string, meta: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('Prisma request failed', {
    code,
    clientVersion: '6.19.3',
    meta,
  });
}

beforeEach(() => {
  authMock.mockResolvedValue({ user: { id: '7', role: 'admin' } });
  redirectMock.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
  hashMock.mockResolvedValue('hashed-password');
});

describe('createUser', () => {
  test('redirects unauthenticated users to login', async () => {
    authMock.mockResolvedValue(null);

    await expect(createUser(EMPTY_STATE, buildFormData())).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('redirects non-admin users to the dashboard', async () => {
    authMock.mockResolvedValue({ user: { id: '8', role: 'coordinator' } });

    await expect(createUser(EMPTY_STATE, buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/dashboard'
    );
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('returns validation errors without touching the database', async () => {
    const result = await createUser(EMPTY_STATE, buildFormData({ documentId: '77777776' }));

    expect(result.errors?.documentId).toEqual(['Ingresá una cédula uruguaya válida.']);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('creates the user and audit event in one transaction', async () => {
    const { userCreate } = setupTransaction();

    await expect(createUser(EMPTY_STATE, buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/management/users'
    );

    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function));
    expect(userCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        firstName: 'Ana',
        lastName: 'García',
        documentId: '77777777',
        email: 'ana@gmail.com',
        role: 'coordinator',
        status: 'active',
        passwordHash: 'hashed-password',
        mustChangePassword: true,
        createdBy: 7,
      }),
    });
    expect(hashMock).toHaveBeenCalledWith('Test1234', 10);
    expect(logAuditMock).toHaveBeenCalledWith(expect.anything(), {
      authorId: 7,
      action: 'creation',
      entity: 'user',
      entityId: 42,
    });
  });

  test('normalizes and trims user data before creating the user', async () => {
    const { userCreate } = setupTransaction();

    await expect(
      createUser(
        EMPTY_STATE,
        buildFormData({
          firstName: ' Ana ',
          lastName: ' García ',
          documentId: '7.777.777-7',
          email: ' ana@gmail.com ',
        })
      )
    ).rejects.toThrow('NEXT_REDIRECT:/management/users');

    expect(userCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        firstName: 'Ana',
        lastName: 'García',
        documentId: '77777777',
        email: 'ana@gmail.com',
      }),
    });
  });

  test('asks for confirmation before restoring a deleted user with the same document id', async () => {
    const { userCreate, userUpdate } = setupTransaction({ deletedUserId: 13 });

    const result = await createUser(EMPTY_STATE, buildFormData());

    expect(result).toEqual({ restoreConfirmationRequired: true, values: SUBMITTED_VALUES });
    expect(userCreate).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
    expect(logAuditMock).not.toHaveBeenCalled();
  });

  test('restores a deleted user with the same document id once confirmed', async () => {
    const { userCreate, userUpdate } = setupTransaction({ deletedUserId: 13 });

    const result = await createUser(EMPTY_STATE, buildFormData({ confirmRestore: 'true' }));

    expect(result).toEqual({ restored: true });
    expect(userCreate).not.toHaveBeenCalled();
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 13, deletedAt: { not: null } },
      data: expect.objectContaining({
        firstName: 'Ana',
        email: 'ana@gmail.com',
        status: 'active',
        passwordHash: 'hashed-password',
        mustChangePassword: true,
        passwordChangedAt: expect.any(Date),
        deletedAt: null,
      }),
    });
    expect(logAuditMock).toHaveBeenCalledWith(expect.anything(), {
      authorId: 7,
      action: 'creation',
      entity: 'user',
      entityId: 13,
      details: { restored: true },
    });
  });

  test('returns error for a weak password', async () => {
    const result = await createUser(EMPTY_STATE, buildFormData({ password: '1234' }));

    expect(result.errors?.password).toEqual(
      expect.arrayContaining([
        'La contraseña debe tener al menos 8 caracteres.',
        'La contraseña debe tener al menos una mayúscula.',
        'La contraseña debe tener al menos una minúscula.',
      ])
    );
    expect(transactionMock).not.toHaveBeenCalled();
    expect(hashMock).not.toHaveBeenCalled();
  });

  test('returns a duplicate document error', async () => {
    transactionMock.mockRejectedValue(knownRequestError('P2002', { target: ['documentId'] }));

    await expect(createUser(EMPTY_STATE, buildFormData())).resolves.toEqual({
      formError: 'Ya existe un usuario con ese documento.',
      values: SUBMITTED_VALUES,
    });
  });

  test('returns a duplicate email error', async () => {
    transactionMock.mockRejectedValue(knownRequestError('P2002', { target: ['email'] }));

    await expect(createUser(EMPTY_STATE, buildFormData())).resolves.toEqual({
      formError: 'Ya existe un usuario con ese correo electrónico.',
      values: SUBMITTED_VALUES,
    });
  });

  test('returns a session error for an invalid author reference', async () => {
    transactionMock.mockRejectedValue(knownRequestError('P2003', {}));

    await expect(createUser(EMPTY_STATE, buildFormData())).resolves.toEqual({
      formError: 'Tu sesión ya no es válida. Cerrá sesión y volvé a ingresar.',
      values: SUBMITTED_VALUES,
    });
  });

  test('returns a generic error when user creation fails', async () => {
    transactionMock.mockRejectedValue(new Error('Database error'));

    await expect(createUser(EMPTY_STATE, buildFormData())).resolves.toEqual({
      formError: 'No se pudo crear el usuario. Intentá de nuevo.',
      values: SUBMITTED_VALUES,
    });
  });
});

describe('generateTemporaryPassword', () => {
  test('generates a character password with all required character types', () => {
    const password = generateTemporaryPassword();

    expect(password).toHaveLength(8);
    expect(password).toMatch(/[A-Z]/);
    expect(password).toMatch(/[a-z]/);
    expect(password).toMatch(/[0-9]/);
  });
});
