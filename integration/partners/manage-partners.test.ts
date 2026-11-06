import { afterEach, beforeAll, expect, test } from 'vitest';
import { createPartner, deletePartner, reorderPartners } from '@/app/actions/partners';
import { getPartners } from '@/lib/partners';
import prisma from '@/lib/prisma';
import { loadSeedData, type SeedData } from '../fixtures';
import { signInAs } from '../session';

let seed: SeedData;
let createdIds: number[] = [];
let createdUserIds: number[] = [];

beforeAll(async () => {
  seed = await loadSeedData();
});

afterEach(async () => {
  await prisma.auditLog.deleteMany({
    where: { entity: 'partner', OR: [{ entityId: { in: createdIds } }, { entityId: null }] },
  });
  await prisma.partner.deleteMany({ where: { id: { in: createdIds } } });
  createdIds = [];
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  createdUserIds = [];
});

async function createFixture() {
  const partner = await prisma.partner.create({ data: { name: 'Partner under test' } });
  createdIds.push(partner.id);
  return partner;
}

test.each([null, 'coordinator'] as const)('rejects mutations for %s', async (role) => {
  const partner = await createFixture();
  if (!role) {
    await expect(createPartner('Unauthorized partner')).rejects.toThrow('NEXT_REDIRECT:/login');
    await expect(deletePartner(partner.id)).rejects.toThrow('NEXT_REDIRECT:/login');
    await expect(reorderPartners([partner.id])).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(await prisma.partner.findUnique({ where: { id: partner.id } })).toEqual(partner);
    return;
  }
  signInAs(seed.coordinatorId, 'admin');
  expect((await createPartner('Unauthorized partner')).success).toBe(false);
  expect((await deletePartner(partner.id)).success).toBe(false);
  expect((await reorderPartners([partner.id])).success).toBe(false);
  expect(await prisma.partner.findUnique({ where: { id: partner.id } })).toEqual(partner);
  expect(await prisma.partner.findFirst({ where: { name: 'Unauthorized partner' } })).toBeNull();
});

test('persists the public order and appends newly created partners', async () => {
  signInAs(seed.adminId, 'admin');
  await createFixture();
  const second = await prisma.partner.create({ data: { name: 'Second partner' } });
  createdIds.push(second.id);
  const ids = (await getPartners()).map(({ id }) => id);
  const reordered = [second.id, ...ids.filter((id) => id !== second.id)];
  expect((await reorderPartners(reordered)).success).toBe(true);
  expect((await getPartners()).map(({ id }) => id)).toEqual(reordered);
  const result = await createPartner('Appended partner');
  if (!result.success) throw new Error(result.message);
  createdIds.push(result.partner.id);
  expect((await getPartners()).at(-1)).toEqual(result.partner);
  const logs = await prisma.auditLog.findMany({
    where: { entity: 'partner', entityId: null, action: 'update' },
  });
  expect(logs).toHaveLength(1);
  expect(logs[0]).toMatchObject({ authorId: seed.adminId });
  const names = new Map((await prisma.partner.findMany()).map(({ id, name }) => [id, name]));
  expect(logs[0].details).toEqual({
    order: {
      from: ids.map((id) => names.get(id)),
      to: reordered.map((id) => names.get(id)),
    },
  });
});

test('rejects duplicate, incomplete, deleted and stale partner lists without changing the order', async () => {
  signInAs(seed.adminId, 'admin');
  const first = await createFixture();
  const deleted = await prisma.partner.create({
    data: { name: 'Deleted partner', deletedAt: new Date() },
  });
  createdIds.push(deleted.id);
  const before = await getPartners();
  const ids = before.map(({ id }) => id);
  for (const input of [[...ids, first.id], [], [deleted.id], [...ids, 2147483647], ['1'], null]) {
    expect((await reorderPartners(input)).success).toBe(false);
    expect(await getPartners()).toEqual(before);
  }
});

test('publishes a trimmed name and soft deletes it, recording both actions', async () => {
  signInAs(seed.adminId, 'admin');
  const result = await createPartner('  New partner  ');
  if (!result.success) throw new Error(result.message);
  createdIds.push(result.partner.id);
  expect(result.partner.name).toBe('New partner');
  expect(await getPartners()).toContainEqual(result.partner);
  expect((await deletePartner(result.partner.id)).success).toBe(true);
  expect(await getPartners()).not.toContainEqual(result.partner);
  const deleted = await prisma.partner.findUniqueOrThrow({
    where: { id: result.partner.id },
  });
  expect(deleted.name).toBe(result.partner.name);
  expect(deleted.deletedAt).toBeInstanceOf(Date);
  const logs = await prisma.auditLog.findMany({
    where: { entity: 'partner', entityId: result.partner.id },
    orderBy: { id: 'asc' },
  });
  expect(logs.map(({ action }) => action)).toEqual(['creation', 'deletion']);
});

test('allows publishing a deleted name again while retaining the original row', async () => {
  const partner = await createFixture();
  signInAs(seed.adminId, 'admin');
  expect((await deletePartner(partner.id)).success).toBe(true);
  const result = await createPartner(partner.name.toUpperCase());
  if (!result.success) throw new Error(result.message);
  createdIds.push(result.partner.id);
  expect(result.partner.id).not.toBe(partner.id);
  expect(await getPartners()).toContainEqual(result.partner);
  const original = await prisma.partner.findUniqueOrThrow({ where: { id: partner.id } });
  expect(original.deletedAt).toBeInstanceOf(Date);
});

test('does not delete or audit an already deleted partner again', async () => {
  const partner = await createFixture();
  signInAs(seed.adminId, 'admin');
  expect((await deletePartner(partner.id)).success).toBe(true);
  const original = await prisma.partner.findUniqueOrThrow({ where: { id: partner.id } });
  expect((await deletePartner(partner.id)).success).toBe(false);
  expect(await prisma.partner.findUnique({ where: { id: partner.id } })).toEqual(original);
  expect(
    await prisma.auditLog.count({
      where: { entity: 'partner', entityId: partner.id, action: 'deletion' },
    })
  ).toBe(1);
});

test('rejects case-insensitive duplicates without changing published partners', async () => {
  const partner = await createFixture();
  signInAs(seed.adminId, 'admin');
  const before = await getPartners();
  const result = await createPartner(`  ${partner.name.toUpperCase()}  `);
  expect(result.success).toBe(false);
  expect(result.message).toContain('Ya existe');
  expect(await getPartners()).toEqual(before);
});

test.each(['', '   ', 'a'.repeat(101), null])('rejects invalid names: %s', async (name) => {
  signInAs(seed.adminId, 'admin');
  const before = await getPartners();
  expect((await createPartner(name)).success).toBe(false);
  expect(await getPartners()).toEqual(before);
});

test.each([0, -1, '1', null])('rejects invalid deletion identifiers: %s', async (id) => {
  signInAs(seed.adminId, 'admin');
  const before = await getPartners();
  expect((await deletePartner(id)).success).toBe(false);
  expect(await getPartners()).toEqual(before);
});

test.each(['disabled', 'deleted'] as const)(
  'rejects an admin with an existing session after being %s',
  async (state) => {
    const adminData = await prisma.user.findUniqueOrThrow({
      where: { id: seed.adminId },
      select: { firstName: true, lastName: true, passwordHash: true, role: true, status: true },
    });
    const admin = await prisma.user.create({
      data: {
        ...adminData,
        documentId: `stale-admin-${state}`,
        email: `stale-admin-${state}@example.test`,
      },
    });
    createdUserIds.push(admin.id);
    signInAs(admin.id, 'admin');
    await prisma.user.update({
      where: { id: admin.id },
      data: state === 'disabled' ? { status: 'disabled' } : { deletedAt: new Date() },
    });
    const partner = await createFixture();
    const before = await getPartners();
    await expect(createPartner('Unauthorized partner')).rejects.toThrow('NEXT_REDIRECT:/login');
    await expect(deletePartner(partner.id)).rejects.toThrow('NEXT_REDIRECT:/login');
    await expect(reorderPartners(before.map(({ id }) => id))).rejects.toThrow(
      'NEXT_REDIRECT:/login'
    );
    expect(await getPartners()).toEqual(before);
    expect(await prisma.auditLog.count({ where: { authorId: admin.id } })).toBe(0);
  }
);

test('concurrent creations never commit the same position', async () => {
  signInAs(seed.adminId, 'admin');
  const names = Array.from({ length: 6 }, (_, index) => `Concurrent partner ${index}`);
  const results = await Promise.all(names.map((name) => createPartner(name)));
  const created = await prisma.partner.findMany({ where: { name: { in: names } } });
  createdIds.push(...created.map(({ id }) => id));
  expect(created.length).toBeGreaterThan(0);
  expect(created.length).toBe(results.filter(({ success }) => success).length);
  expect(new Set(created.map(({ sortOrder }) => sortOrder)).size).toBe(created.length);
});

test('updates a large order with a single audit entry', async () => {
  signInAs(seed.adminId, 'admin');
  const created = await prisma.partner.createManyAndReturn({
    data: Array.from({ length: 100 }, (_, index) => ({
      name: `Bulk partner ${index}`,
      sortOrder: index + 1,
    })),
  });
  createdIds.push(...created.map(({ id }) => id));
  const order = [...created].reverse().map(({ id }) => id);
  expect((await reorderPartners(order)).success).toBe(true);
  expect((await getPartners()).map(({ id }) => id)).toEqual(order);
  expect(
    await prisma.auditLog.count({
      where: { entity: 'partner', entityId: null, action: 'update' },
    })
  ).toBe(1);
});
