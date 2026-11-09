import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { createUser } from '@/app/actions/users';
import { hashToken } from '@/lib/auth/user-tokens';
import { sendEmail } from '@/lib/email/client';
import { verifyPassword, verifyUserCredentials } from '@/lib/credentials';
import { acceptInvitation } from '@/app/actions/invitation';
import prisma from '@/lib/prisma';
import { loadSeedData, type SeedData } from '../fixtures';
import { signInAs, signOut } from '../session';
import { createTestUser, deleteTestUsers } from './user-helpers';

vi.mock('next/headers', () => ({ cookies: vi.fn(async () => ({ set: vi.fn() })) }));
vi.mock('@/lib/email/client', () => ({ sendEmail: vi.fn(async () => true) }));

const PASSWORD = 'CreatedUser1';
const INVITATION_TOKEN = 'integration-invitation-token';
const DOCUMENT_ID = '54321044';
const OTHER_DOCUMENT_ID = '54321050';
const EMAIL = 'integration-create-user@gurisesunidos.test';
const TEST_DOCUMENT_IDS = [DOCUMENT_ID, OTHER_DOCUMENT_ID];

let seed: SeedData;

const TEMPORARY_PASSWORD = 'Temporary1';

function buildFormData(overrides: Record<string, string> = {}) {
  const fields: Record<string, string> = {
    firstName: 'Created',
    lastName: 'User',
    documentId: DOCUMENT_ID,
    email: EMAIL,
    role: 'coordinator',
    ...overrides,
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

function countRows() {
  return Promise.all([prisma.user.count(), prisma.auditLog.count()]);
}

async function inviteUser() {
  signInAs(seed.adminId, 'admin');
  await expect(createUser({}, buildFormData())).rejects.toThrow(
    /^NEXT_REDIRECT:\/management\/users$/
  );
  const user = await prisma.user.findUniqueOrThrow({ where: { documentId: DOCUMENT_ID } });
  await prisma.userToken.updateMany({
    where: { userId: user.id, type: 'invitation' },
    data: { tokenHash: hashToken(INVITATION_TOKEN) },
  });
  const formData = new FormData();
  formData.set('token', INVITATION_TOKEN);
  formData.set('newPassword', PASSWORD);
  formData.set('confirmNewPassword', PASSWORD);
  return { userId: user.id, formData };
}

beforeAll(async () => {
  seed = await loadSeedData();
});

beforeEach(() => {
  vi.mocked(sendEmail).mockClear();
});

afterEach(async () => {
  await deleteTestUsers(TEST_DOCUMENT_IDS);
});

describe('createUser (integration)', () => {
  test('creates a pending user with an invitation token and audits the creation', async () => {
    signInAs(seed.adminId, 'admin');

    await expect(createUser({}, buildFormData())).rejects.toThrow(
      /^NEXT_REDIRECT:\/management\/users$/
    );

    const user = await prisma.user.findUniqueOrThrow({ where: { documentId: DOCUMENT_ID } });
    expect(user).toMatchObject({
      firstName: 'Created',
      lastName: 'User',
      email: EMAIL,
      role: 'coordinator',
      status: 'pendingInvitation',
      createdBy: seed.adminId,
      mustChangePassword: false,
      deletedAt: null,
    });
    expect(
      await prisma.userToken.findMany({ where: { userId: user.id, type: 'invitation' } })
    ).toEqual([expect.objectContaining({ usedAt: null })]);
    expect(
      await prisma.auditLog.findMany({ where: { entity: 'user', entityId: user.id } })
    ).toEqual([
      expect.objectContaining({ action: 'creation', authorId: seed.adminId, entityId: user.id }),
    ]);
    expect(sendEmail).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ to: EMAIL }));
  });

  test('creates an admin', async () => {
    signInAs(seed.adminId, 'admin');

    await expect(createUser({}, buildFormData({ role: 'admin' }))).rejects.toThrow(
      /^NEXT_REDIRECT:\/management\/users$/
    );

    const user = await prisma.user.findUniqueOrThrow({ where: { documentId: DOCUMENT_ID } });
    expect(user.role).toBe('admin');
  });

  test('normalizes the document id and the email before storing them', async () => {
    signInAs(seed.adminId, 'admin');

    await expect(
      createUser(
        {},
        buildFormData({
          firstName: '  Created  ',
          documentId: '5.432.104-4',
          email: '  Integration-Create-User@GurisesUnidos.test ',
        })
      )
    ).rejects.toThrow(/^NEXT_REDIRECT:\/management\/users$/);

    const user = await prisma.user.findUniqueOrThrow({ where: { documentId: DOCUMENT_ID } });
    expect(user).toMatchObject({ firstName: 'Created', email: EMAIL });
  });

  test('rejects a document id that is already registered', async () => {
    await createTestUser(DOCUMENT_ID);
    signInAs(seed.adminId, 'admin');
    const before = await countRows();

    const result = await createUser({}, buildFormData({ documentId: '5.432.104-4' }));

    expect(result.formError).toBe('Ya existe un usuario con ese documento.');
    expect(result.values).toMatchObject({ documentId: '5.432.104-4', email: EMAIL });
    expect(await countRows()).toEqual(before);
  });

  test('rejects an email that is already registered regardless of case', async () => {
    await createTestUser(OTHER_DOCUMENT_ID, { email: EMAIL });
    signInAs(seed.adminId, 'admin');
    const before = await countRows();

    const result = await createUser({}, buildFormData({ email: EMAIL.toUpperCase() }));

    expect(result.formError).toBe('Ya existe un usuario con ese correo electrónico.');
    expect(await countRows()).toEqual(before);
  });

  test('asks for confirmation before restoring a deleted user and changes nothing', async () => {
    await createTestUser(DOCUMENT_ID, { firstName: 'Old', deletedAt: new Date() });
    signInAs(seed.adminId, 'admin');
    const before = await countRows();

    const result = await createUser({}, buildFormData());

    expect(result).toMatchObject({ restoreConfirmationRequired: true, values: { email: EMAIL } });
    expect(await countRows()).toEqual(before);
    const user = await prisma.user.findUniqueOrThrow({ where: { documentId: DOCUMENT_ID } });
    expect(user).toMatchObject({ firstName: 'Old', deletedAt: expect.any(Date) });
  });

  test('restores a deleted user as a pending invitation once confirmed', async () => {
    const deletedUser = await createTestUser(DOCUMENT_ID, {
      firstName: 'Old',
      role: 'admin',
      status: 'disabled',
      deletedAt: new Date('2026-01-01T00:00:00Z'),
    });
    signInAs(seed.adminId, 'admin');
    const [usersBefore] = await countRows();

    const result = await createUser(
      {},
      buildFormData({ documentId: '5.432.104-4', confirmRestore: 'true' })
    );

    expect(result).toEqual({ restored: true });
    const user = await prisma.user.findUniqueOrThrow({ where: { documentId: DOCUMENT_ID } });
    expect(user).toMatchObject({
      id: deletedUser.id,
      firstName: 'Created',
      lastName: 'User',
      email: EMAIL,
      role: 'coordinator',
      status: 'pendingInvitation',
      mustChangePassword: false,
      passwordChangedAt: null,
      deletedAt: null,
    });
    expect(
      await prisma.userToken.findMany({ where: { userId: user.id, type: 'invitation' } })
    ).toEqual([expect.objectContaining({ usedAt: null })]);
    expect(await prisma.user.count()).toBe(usersBefore);
    expect(
      await prisma.auditLog.findMany({ where: { entity: 'user', entityId: user.id } })
    ).toEqual([
      expect.objectContaining({
        action: 'creation',
        authorId: seed.adminId,
        details: { restored: true },
      }),
    ]);
  });

  test('rejects restoring a deleted user when the email belongs to another user', async () => {
    await createTestUser(DOCUMENT_ID, { deletedAt: new Date() });
    await createTestUser(OTHER_DOCUMENT_ID, { email: EMAIL });
    signInAs(seed.adminId, 'admin');
    const before = await countRows();

    const result = await createUser({}, buildFormData({ confirmRestore: 'true' }));

    expect(result.formError).toBe('Ya existe un usuario con ese correo electrónico.');
    expect(await countRows()).toEqual(before);
    const user = await prisma.user.findUniqueOrThrow({ where: { documentId: DOCUMENT_ID } });
    expect(user.deletedAt).not.toBeNull();
  });

  test('activates the user once the invitation is accepted', async () => {
    const { userId, formData } = await inviteUser();
    signOut();

    await expect(acceptInvitation({}, formData)).rejects.toThrow(/^NEXT_REDIRECT:\/dashboard$/);

    const activated = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(activated.status).toBe('active');
    expect(await acceptInvitation({}, formData)).toEqual({
      formError: 'Esta invitación ya fue usada. Si ya completaste tu registro, iniciá sesión.',
    });
  });

  test('activates the user without replacing the session of someone already signed in', async () => {
    const { userId, formData } = await inviteUser();

    await expect(acceptInvitation({}, formData)).rejects.toThrow(
      /^NEXT_REDIRECT:\/dashboard\?invitationAccepted=1$/
    );

    const activated = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(activated.status).toBe('active');
  });

  test('returns field errors and preserves the submitted values', async () => {
    signInAs(seed.adminId, 'admin');
    const before = await countRows();

    const result = await createUser(
      {},
      buildFormData({
        firstName: '',
        documentId: '12345678',
        email: 'not-an-email',
      })
    );

    expect(result.errors).toMatchObject({
      firstName: ['El nombre es obligatorio.'],
      documentId: ['Ingresá una cédula uruguaya válida.'],
      email: ['Ingresá un correo electrónico válido.'],
    });
    expect(result.values).toEqual({
      firstName: '',
      lastName: 'User',
      documentId: '12345678',
      email: 'not-an-email',
      role: 'coordinator',
    });
    expect(await countRows()).toEqual(before);
  });

  test('redirects a coordinator to the dashboard', async () => {
    signInAs(seed.coordinatorId, 'coordinator');
    const before = await countRows();

    await expect(createUser({}, buildFormData())).rejects.toThrow(/^NEXT_REDIRECT:\/dashboard$/);
    expect(await countRows()).toEqual(before);
  });

  test('redirects to login when nobody is signed in', async () => {
    const before = await countRows();

    await expect(createUser({}, buildFormData())).rejects.toThrow(/^NEXT_REDIRECT:\/login$/);
    expect(await countRows()).toEqual(before);
  });
});

describe('createUser with a temporary password (integration)', () => {
  function passwordFormData(overrides: Record<string, string> = {}) {
    return buildFormData({
      creationMethod: 'password',
      password: TEMPORARY_PASSWORD,
      ...overrides,
    });
  }

  async function createWithPassword(overrides: Record<string, string> = {}) {
    signInAs(seed.adminId, 'admin');
    await expect(createUser({}, passwordFormData(overrides))).rejects.toThrow(
      /^NEXT_REDIRECT:\/management\/users$/
    );
    return prisma.user.findUniqueOrThrow({ where: { documentId: DOCUMENT_ID } });
  }

  test('creates an active user that must change the password and audits the creation', async () => {
    const user = await createWithPassword();

    expect(user).toMatchObject({
      firstName: 'Created',
      lastName: 'User',
      email: EMAIL,
      role: 'coordinator',
      status: 'active',
      createdBy: seed.adminId,
      mustChangePassword: true,
      passwordChangedAt: expect.any(Date),
      deletedAt: null,
    });
    expect(
      await prisma.auditLog.findMany({ where: { entity: 'user', entityId: user.id } })
    ).toEqual([
      expect.objectContaining({ action: 'creation', authorId: seed.adminId, entityId: user.id }),
    ]);
  });

  test('stores a hash of the password and never the plain text', async () => {
    const user = await createWithPassword();

    expect(user.passwordHash).not.toContain(TEMPORARY_PASSWORD);
    expect(await verifyPassword(TEMPORARY_PASSWORD, user.passwordHash)).toBe(true);
    expect(await verifyPassword('Another1Password', user.passwordHash)).toBe(false);
  });

  test('lets the new user authenticate with the temporary password', async () => {
    await createWithPassword();

    const authenticated = await verifyUserCredentials(DOCUMENT_ID, TEMPORARY_PASSWORD);

    expect(authenticated).toMatchObject({ documentId: DOCUMENT_ID, mustChangePassword: true });
    expect(await verifyUserCredentials(DOCUMENT_ID, 'WrongPassword1')).toBeNull();
  });

  test('does not issue an invitation token nor send any email', async () => {
    const user = await createWithPassword();

    expect(await prisma.userToken.count({ where: { userId: user.id } })).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
  });

  test('creates an admin', async () => {
    const user = await createWithPassword({ role: 'admin' });

    expect(user).toMatchObject({ role: 'admin', status: 'active', mustChangePassword: true });
  });

  test.each([
    ['missing', { password: '' }, 'La contraseña es obligatoria.'],
    ['too short', { password: 'Abc123' }, 'La contraseña debe tener al menos 8 caracteres.'],
    [
      'without an uppercase letter',
      { password: 'temporary1' },
      'La contraseña debe tener al menos una mayúscula.',
    ],
  ])(
    'rejects a password that is %s without creating anything',
    async (_label, override, message) => {
      signInAs(seed.adminId, 'admin');
      const before = await countRows();

      const result = await createUser({}, passwordFormData(override));

      expect(result.errors?.password).toEqual([message]);
      expect(result.values).toMatchObject({ documentId: DOCUMENT_ID, email: EMAIL });
      expect(await countRows()).toEqual(before);
      expect(sendEmail).not.toHaveBeenCalled();
    }
  );

  test('rejects a document id that is already registered', async () => {
    await createTestUser(DOCUMENT_ID);
    signInAs(seed.adminId, 'admin');
    const before = await countRows();

    const result = await createUser({}, passwordFormData());

    expect(result.formError).toBe('Ya existe un usuario con ese documento.');
    expect(await countRows()).toEqual(before);
  });

  test('rejects an email that is already registered', async () => {
    await createTestUser(OTHER_DOCUMENT_ID, { email: EMAIL });
    signInAs(seed.adminId, 'admin');
    const before = await countRows();

    const result = await createUser({}, passwordFormData());

    expect(result.formError).toBe('Ya existe un usuario con ese correo electrónico.');
    expect(await countRows()).toEqual(before);
  });

  test('asks for confirmation before restoring a deleted user and changes nothing', async () => {
    const deletedUser = await createTestUser(DOCUMENT_ID, {
      firstName: 'Old',
      deletedAt: new Date(),
    });
    signInAs(seed.adminId, 'admin');
    const before = await countRows();

    const result = await createUser({}, passwordFormData());

    expect(result).toMatchObject({ restoreConfirmationRequired: true });
    expect(await countRows()).toEqual(before);
    const user = await prisma.user.findUniqueOrThrow({ where: { documentId: DOCUMENT_ID } });
    expect(user).toMatchObject({
      firstName: 'Old',
      passwordHash: deletedUser.passwordHash,
      deletedAt: expect.any(Date),
    });
  });

  test('restores a deleted user as active with the new temporary password once confirmed', async () => {
    const deletedUser = await createTestUser(DOCUMENT_ID, {
      firstName: 'Old',
      role: 'admin',
      status: 'disabled',
      deletedAt: new Date('2026-01-01T00:00:00Z'),
    });
    signInAs(seed.adminId, 'admin');
    const [usersBefore] = await countRows();

    const result = await createUser({}, passwordFormData({ confirmRestore: 'true' }));

    expect(result).toEqual({ restored: true });
    const user = await prisma.user.findUniqueOrThrow({ where: { documentId: DOCUMENT_ID } });
    expect(user).toMatchObject({
      id: deletedUser.id,
      firstName: 'Created',
      email: EMAIL,
      role: 'coordinator',
      status: 'active',
      mustChangePassword: true,
      passwordChangedAt: expect.any(Date),
      deletedAt: null,
    });
    expect(await verifyPassword(TEMPORARY_PASSWORD, user.passwordHash)).toBe(true);
    expect(await verifyPassword('TestPassword1', user.passwordHash)).toBe(false);
    expect(await prisma.user.count()).toBe(usersBefore);
    expect(await prisma.userToken.count({ where: { userId: user.id } })).toBe(0);
    expect(sendEmail).not.toHaveBeenCalled();
    expect(
      await prisma.auditLog.findMany({ where: { entity: 'user', entityId: user.id } })
    ).toEqual([
      expect.objectContaining({
        action: 'creation',
        authorId: seed.adminId,
        details: { restored: true },
      }),
    ]);
  });

  test('ignores a submitted password when inviting', async () => {
    signInAs(seed.adminId, 'admin');

    await expect(
      createUser({}, buildFormData({ creationMethod: 'invitation', password: TEMPORARY_PASSWORD }))
    ).rejects.toThrow(/^NEXT_REDIRECT:\/management\/users$/);

    const user = await prisma.user.findUniqueOrThrow({ where: { documentId: DOCUMENT_ID } });
    expect(user).toMatchObject({ status: 'pendingInvitation', mustChangePassword: false });
    expect(await verifyPassword(TEMPORARY_PASSWORD, user.passwordHash)).toBe(false);
    expect(await verifyUserCredentials(DOCUMENT_ID, TEMPORARY_PASSWORD)).toBeNull();
  });

  test('redirects a coordinator to the dashboard and creates nothing', async () => {
    signInAs(seed.coordinatorId, 'coordinator');
    const before = await countRows();

    await expect(createUser({}, passwordFormData())).rejects.toThrow(/^NEXT_REDIRECT:\/dashboard$/);
    expect(await countRows()).toEqual(before);
  });

  test('redirects to login when nobody is signed in', async () => {
    const before = await countRows();

    await expect(createUser({}, passwordFormData())).rejects.toThrow(/^NEXT_REDIRECT:\/login$/);
    expect(await countRows()).toEqual(before);
  });
});
