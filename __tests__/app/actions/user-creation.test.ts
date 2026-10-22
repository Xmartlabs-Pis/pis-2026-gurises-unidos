import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { UserFormState } from '@/lib/validation/user';
import { createUser } from '@/app/actions/users';
import { generateTemporaryPassword } from '@/lib/users';
import { Prisma } from '@/generated/prisma/client';

const {
  authMock,
  redirectMock,
  logAuditMock,
  transactionMock,
  hashMock,
  createUserTokenMock,
  sendInvitationEmailMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  logAuditMock: vi.fn(),
  transactionMock: vi.fn(),
  hashMock: vi.fn(),
  createUserTokenMock: vi.fn(),
  sendInvitationEmailMock: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/audit-log', () => ({ logAudit: logAuditMock }));
vi.mock('@/lib/credentials', () => ({ hashPassword: hashMock }));
vi.mock('@/lib/auth/user-tokens', () => ({ createUserToken: createUserTokenMock }));
vi.mock('@/lib/users/invitation', () => ({ sendInvitationEmail: sendInvitationEmailMock }));
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
    ...overrides,
  };

  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

function setupTransaction({ userId = 42, deletedUserId = null as number | null } = {}) {
  const userCreate = vi
    .fn()
    .mockResolvedValue({ id: userId, firstName: 'Ana', email: 'ana@gmail.com' });
  const userUpdate = vi
    .fn()
    .mockResolvedValue({ id: deletedUserId, firstName: 'Ana', email: 'ana@gmail.com' });
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
  hashMock.mockResolvedValue('unusable-hash');
  createUserTokenMock.mockResolvedValue('invitation-token');
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

  test('creates a pending user, audit event and invitation token in one transaction', async () => {
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
        status: 'pendingInvitation',
        passwordHash: 'unusable-hash',
        createdBy: 7,
      }),
    });
    expect(logAuditMock).toHaveBeenCalledWith(expect.anything(), {
      authorId: 7,
      action: 'creation',
      entity: 'user',
      entityId: 42,
    });
    expect(createUserTokenMock).toHaveBeenCalledWith(expect.anything(), 42, 'invitation');
  });

  test('sends the invitation email to the created user', async () => {
    setupTransaction();

    await expect(createUser(EMPTY_STATE, buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/management/users'
    );

    expect(sendInvitationEmailMock).toHaveBeenCalledWith(
      { id: 42, firstName: 'Ana', email: 'ana@gmail.com' },
      'invitation-token',
      7
    );
  });

  test('does not send an invitation when the user cannot be created', async () => {
    transactionMock.mockRejectedValue(knownRequestError('P2002', { target: ['email'] }));

    await createUser(EMPTY_STATE, buildFormData());

    expect(sendInvitationEmailMock).not.toHaveBeenCalled();
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
    expect(sendInvitationEmailMock).not.toHaveBeenCalled();
  });

  test('restores a deleted user as a pending invitation once confirmed', async () => {
    const { userCreate, userUpdate } = setupTransaction({ deletedUserId: 13 });

    const result = await createUser(EMPTY_STATE, buildFormData({ confirmRestore: 'true' }));

    expect(result).toEqual({ restored: true });
    expect(userCreate).not.toHaveBeenCalled();
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: 13, deletedAt: { not: null } },
      data: expect.objectContaining({
        firstName: 'Ana',
        email: 'ana@gmail.com',
        status: 'pendingInvitation',
        passwordHash: 'unusable-hash',
        mustChangePassword: false,
        passwordChangedAt: null,
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
    expect(createUserTokenMock).toHaveBeenCalledWith(expect.anything(), 13, 'invitation');
    expect(sendInvitationEmailMock).toHaveBeenCalledWith(
      { id: 13, firstName: 'Ana', email: 'ana@gmail.com' },
      'invitation-token',
      7
    );
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
