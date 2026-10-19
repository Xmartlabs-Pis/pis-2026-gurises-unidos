import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { updateUserStatus } from '@/app/actions/users';
import prisma from '@/lib/prisma';
import { loadSeedData, type SeedData } from '../fixtures';
import { signInAs } from '../session';
import { createTestUser, deleteTestUsers, userAuditLogsFor } from './user-helpers';

const DOCUMENT_ID = '54321066';

let seed: SeedData;

async function loadStatus(id: number) {
  const { status } = await prisma.user.findUniqueOrThrow({ where: { id } });
  return status;
}

beforeAll(async () => {
  seed = await loadSeedData();
});

afterEach(async () => {
  await deleteTestUsers([DOCUMENT_ID]);
});

describe('updateUserStatus (integration)', () => {
  test('disables an active coordinator and audits the change', async () => {
    const user = await createTestUser(DOCUMENT_ID);
    signInAs(seed.adminId);

    const result = await updateUserStatus(user.id, 'disabled');

    expect(result).toEqual({ success: true });
    expect(await loadStatus(user.id)).toBe('disabled');
    expect(await userAuditLogsFor(user.id)).toEqual([
      expect.objectContaining({
        action: 'update',
        entityId: user.id,
        authorId: seed.adminId,
        details: { changes: [{ field: 'status', from: 'active', to: 'disabled' }] },
      }),
    ]);
  });

  test('enables a disabled user', async () => {
    const user = await createTestUser(DOCUMENT_ID, { status: 'disabled' });
    signInAs(seed.adminId);

    const result = await updateUserStatus(user.id, 'active');

    expect(result).toEqual({ success: true });
    expect(await loadStatus(user.id)).toBe('active');
    expect(await userAuditLogsFor(user.id)).toEqual([
      expect.objectContaining({
        details: { changes: [{ field: 'status', from: 'disabled', to: 'active' }] },
      }),
    ]);
  });

  test('disables an admin while another active admin remains', async () => {
    const user = await createTestUser(DOCUMENT_ID, { role: 'admin' });
    signInAs(seed.adminId);

    const result = await updateUserStatus(user.id, 'disabled');

    expect(result).toEqual({ success: true });
    expect(await loadStatus(user.id)).toBe('disabled');
  });

  test.each([
    { status: 'disabled', target: 'disabled', error: 'El usuario ya está deshabilitado.' },
    {
      status: 'disabled',
      target: 'pendingInvitation',
      error: 'No se puede deshabilitar a un usuario con invitación pendiente.',
    },
    { status: 'active', target: 'active', error: 'El usuario ya está habilitado.' },
    { status: 'active', target: 'pendingInvitation', error: 'El usuario ya está habilitado.' },
  ] as const)('rejects changing a $target user to $status', async ({ status, target, error }) => {
    const user = await createTestUser(DOCUMENT_ID, { status: target });
    signInAs(seed.adminId);

    const result = await updateUserStatus(user.id, status);

    expect(result).toEqual({ error });
    expect(await loadStatus(user.id)).toBe(target);
    expect(await userAuditLogsFor(user.id)).toEqual([]);
  });

  test('rejects a deleted user', async () => {
    const user = await createTestUser(DOCUMENT_ID, { deletedAt: new Date() });
    signInAs(seed.adminId);

    const result = await updateUserStatus(user.id, 'disabled');

    expect(result).toEqual({ error: 'El usuario no existe.' });
    expect(await loadStatus(user.id)).toBe('active');
  });

  test('rejects a user that does not exist', async () => {
    signInAs(seed.adminId);

    const result = await updateUserStatus(999_999_999, 'disabled');

    expect(result).toEqual({ error: 'El usuario no existe.' });
  });

  test('rejects an invalid id or status', async () => {
    const user = await createTestUser(DOCUMENT_ID);
    signInAs(seed.adminId);

    expect(await updateUserStatus(0, 'disabled')).toEqual({ error: 'El usuario no es válido.' });
    expect(await updateUserStatus(user.id, 'pendingInvitation' as unknown as 'active')).toEqual({
      error: 'El usuario no es válido.',
    });
    expect(await loadStatus(user.id)).toBe('active');
  });

  test('rejects changing your own status', async () => {
    signInAs(seed.adminId);

    const result = await updateUserStatus(seed.adminId, 'disabled');

    expect(result).toEqual({ error: 'No podés cambiar tu propio estado.' });
    expect(await loadStatus(seed.adminId)).toBe('active');
  });

  test('rejects a coordinator', async () => {
    const user = await createTestUser(DOCUMENT_ID);
    signInAs(seed.coordinatorId);

    const result = await updateUserStatus(user.id, 'disabled');

    expect(result).toEqual({ error: 'No tenés permisos para realizar esta acción.' });
    expect(await loadStatus(user.id)).toBe('active');
  });

  test('uses the role stored in the database instead of the session', async () => {
    const user = await createTestUser(DOCUMENT_ID);
    signInAs(seed.coordinatorId, 'admin');

    const result = await updateUserStatus(user.id, 'disabled');

    expect(result).toEqual({ error: 'No tenés permisos para realizar esta acción.' });
    expect(await loadStatus(user.id)).toBe('active');
  });

  test('redirects to login when the session user is disabled', async () => {
    const user = await createTestUser(DOCUMENT_ID);
    signInAs(seed.disabledCoordinatorId);

    await expect(updateUserStatus(user.id, 'disabled')).rejects.toThrow(/^NEXT_REDIRECT:\/login$/);
    expect(await loadStatus(user.id)).toBe('active');
  });

  test('redirects to login when nobody is signed in', async () => {
    const user = await createTestUser(DOCUMENT_ID);

    await expect(updateUserStatus(user.id, 'disabled')).rejects.toThrow(/^NEXT_REDIRECT:\/login$/);
    expect(await loadStatus(user.id)).toBe('active');
  });
});
