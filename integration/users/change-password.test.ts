import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { changePassword } from '@/app/actions/password';
import { hashPassword, verifyPassword } from '@/lib/credentials';
import prisma from '@/lib/prisma';
import { loadSeedData, type SeedData } from '../fixtures';
import { signInAs } from '../session';

const CURRENT_PASSWORD = 'Current1pass';
const NEW_PASSWORD = 'Updated2pass';
const INVALID_SESSION_MESSAGE = 'Tu sesión ya no es válida. Iniciá sesión de nuevo.';

let seed: SeedData;
let createdUserIds: number[] = [];
let fixtureCount = 0;

function buildFormData(overrides: Record<string, string> = {}): FormData {
  const fields: Record<string, string> = {
    currentPassword: CURRENT_PASSWORD,
    newPassword: NEW_PASSWORD,
    confirmNewPassword: NEW_PASSWORD,
    ...overrides,
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.append(key, value);
  return formData;
}

async function createUserFixture(
  overrides: { status?: 'active' | 'disabled'; deletedAt?: Date; mustChangePassword?: boolean } = {}
) {
  fixtureCount += 1;
  const user = await prisma.user.create({
    data: {
      firstName: 'Password',
      lastName: 'Changer',
      documentId: `6100${String(fixtureCount).padStart(4, '0')}`,
      email: `change-password-${fixtureCount}@gurisesunidos.test`,
      role: 'coordinator',
      status: 'active',
      passwordHash: await hashPassword(CURRENT_PASSWORD),
      createdBy: seed.adminId,
      ...overrides,
    },
  });
  createdUserIds.push(user.id);
  return user.id;
}

function loadUser(id: number) {
  return prisma.user.findUniqueOrThrow({ where: { id } });
}

function auditLogsFor(id: number) {
  return prisma.auditLog.findMany({
    where: { entity: 'user', entityId: id },
    orderBy: { id: 'asc' },
  });
}

async function expectUnchanged(id: number, before: Awaited<ReturnType<typeof loadUser>>) {
  expect(await loadUser(id)).toEqual(before);
  expect(await auditLogsFor(id)).toEqual([]);
}

beforeAll(async () => {
  seed = await loadSeedData();
});

afterEach(async () => {
  const ids = createdUserIds;
  createdUserIds = [];
  await prisma.$transaction([
    prisma.auditLog.deleteMany({
      where: { OR: [{ entity: 'user', entityId: { in: ids } }, { authorId: { in: ids } }] },
    }),
    prisma.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
});

describe('changePassword (integration)', () => {
  test('stores the new password hash and audits the change', async () => {
    const userId = await createUserFixture({ mustChangePassword: true });
    signInAs(userId);
    const before = await loadUser(userId);

    const result = await changePassword({}, buildFormData());

    expect(result).toEqual({ success: true });
    const user = await loadUser(userId);
    expect(await verifyPassword(NEW_PASSWORD, user.passwordHash)).toBe(true);
    expect(await verifyPassword(CURRENT_PASSWORD, user.passwordHash)).toBe(false);
    expect(user.mustChangePassword).toBe(false);
    expect(user.passwordChangedAt?.getTime()).toBeGreaterThan(before.createdAt.getTime());
    expect(user).toMatchObject({
      firstName: before.firstName,
      email: before.email,
      role: before.role,
      status: before.status,
    });
    expect(await auditLogsFor(userId)).toEqual([
      expect.objectContaining({ action: 'passwordChange', authorId: userId, entityId: userId }),
    ]);
  });

  test('only changes the password of the session user', async () => {
    const userId = await createUserFixture();
    const otherUserId = await createUserFixture();
    signInAs(userId);
    const otherBefore = await loadUser(otherUserId);

    expect(await changePassword({}, buildFormData())).toEqual({ success: true });

    await expectUnchanged(otherUserId, otherBefore);
  });

  test('rejects an incorrect current password', async () => {
    const userId = await createUserFixture();
    signInAs(userId);
    const before = await loadUser(userId);

    const result = await changePassword({}, buildFormData({ currentPassword: 'Wrong1password' }));

    expect(result).toEqual({ formError: 'La contraseña actual es incorrecta' });
    await expectUnchanged(userId, before);
  });

  test('rejects a new password that does not meet the policy', async () => {
    const userId = await createUserFixture();
    signInAs(userId);
    const before = await loadUser(userId);

    const result = await changePassword(
      {},
      buildFormData({ newPassword: 'short', confirmNewPassword: 'short' })
    );

    expect(result.errors?.newPassword).toEqual([
      'La contraseña debe tener al menos 8 caracteres',
      'La contraseña debe tener al menos una mayúscula',
      'La contraseña debe tener al menos un número',
    ]);
    await expectUnchanged(userId, before);
  });

  test('rejects a confirmation that does not match', async () => {
    const userId = await createUserFixture();
    signInAs(userId);
    const before = await loadUser(userId);

    const result = await changePassword(
      {},
      buildFormData({ confirmNewPassword: 'Different3pass' })
    );

    expect(result.errors?.confirmNewPassword).toEqual(['Las contraseñas no coinciden']);
    await expectUnchanged(userId, before);
  });

  test('rejects a new password equal to the current one', async () => {
    const userId = await createUserFixture();
    signInAs(userId);
    const before = await loadUser(userId);

    const result = await changePassword(
      {},
      buildFormData({ newPassword: CURRENT_PASSWORD, confirmNewPassword: CURRENT_PASSWORD })
    );

    expect(result.errors?.newPassword).toEqual([
      'La nueva contraseña debe ser distinta a la actual.',
    ]);
    await expectUnchanged(userId, before);
  });

  test('rejects a request without a session', async () => {
    const result = await changePassword({}, buildFormData());

    expect(result).toEqual({ formError: INVALID_SESSION_MESSAGE });
  });

  test('rejects a disabled user', async () => {
    const userId = await createUserFixture({ status: 'disabled' });
    signInAs(userId);
    const before = await loadUser(userId);

    const result = await changePassword({}, buildFormData());

    expect(result).toEqual({ formError: INVALID_SESSION_MESSAGE });
    await expectUnchanged(userId, before);
  });

  test('rejects a deleted user', async () => {
    const userId = await createUserFixture({ deletedAt: new Date() });
    signInAs(userId);
    const before = await loadUser(userId);

    const result = await changePassword({}, buildFormData());

    expect(result).toEqual({ formError: INVALID_SESSION_MESSAGE });
    await expectUnchanged(userId, before);
  });

  test('rejects a session user that does not exist', async () => {
    signInAs(999_999);

    const result = await changePassword({}, buildFormData());

    expect(result).toEqual({ formError: INVALID_SESSION_MESSAGE });
  });
});
