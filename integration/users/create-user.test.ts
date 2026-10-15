import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { createUser } from '@/app/actions/users';
import { verifyPassword } from '@/lib/credentials';
import prisma from '@/lib/prisma';
import { loadSeedData, type SeedData } from '../fixtures';
import { signInAs } from '../session';
import { createTestUser, deleteTestUsers } from './user-helpers';

const PASSWORD = 'CreatedUser1';
const DOCUMENT_ID = '54321044';
const OTHER_DOCUMENT_ID = '54321050';
const EMAIL = 'integration-create-user@gurisesunidos.test';
const TEST_DOCUMENT_IDS = [DOCUMENT_ID, OTHER_DOCUMENT_ID];

let seed: SeedData;

function buildFormData(overrides: Record<string, string> = {}) {
  const fields: Record<string, string> = {
    firstName: 'Created',
    lastName: 'User',
    documentId: DOCUMENT_ID,
    email: EMAIL,
    role: 'coordinator',
    password: PASSWORD,
    ...overrides,
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

function countRows() {
  return Promise.all([prisma.user.count(), prisma.auditLog.count()]);
}

beforeAll(async () => {
  seed = await loadSeedData();
});

afterEach(async () => {
  await deleteTestUsers(TEST_DOCUMENT_IDS);
});

describe('createUser (integration)', () => {
  test('creates an active user with a hashed password and audits the creation', async () => {
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
      status: 'active',
      createdBy: seed.adminId,
      mustChangePassword: true,
      deletedAt: null,
    });
    expect(await verifyPassword(PASSWORD, user.passwordHash)).toBe(true);
    expect(
      await prisma.auditLog.findMany({ where: { entity: 'user', entityId: user.id } })
    ).toEqual([
      expect.objectContaining({ action: 'creation', authorId: seed.adminId, entityId: user.id }),
    ]);
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

  test('restores a deleted user with the same document id once confirmed', async () => {
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
      status: 'active',
      mustChangePassword: true,
      deletedAt: null,
    });
    expect(user.passwordChangedAt).toBeInstanceOf(Date);
    expect(await verifyPassword(PASSWORD, user.passwordHash)).toBe(true);
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

  test('returns field errors and preserves the values except the password', async () => {
    signInAs(seed.adminId, 'admin');
    const before = await countRows();

    const result = await createUser(
      {},
      buildFormData({
        firstName: '',
        documentId: '12345678',
        email: 'not-an-email',
        password: 'weak',
      })
    );

    expect(result.errors).toMatchObject({
      firstName: ['El nombre es obligatorio.'],
      documentId: ['Ingresá una cédula uruguaya válida.'],
      email: ['Ingresá un correo electrónico válido.'],
    });
    expect(result.errors?.password).toContain('La contraseña debe tener al menos 8 caracteres.');
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
