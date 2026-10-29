import { afterEach, beforeAll, expect, test } from 'vitest';
import {
  createContributor,
  deleteContributor,
  reorderContributors,
} from '@/app/actions/contributors';
import { getContributors } from '@/lib/contributors';
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
    where: { entity: 'contributor', entityId: { in: createdIds } },
  });
  await prisma.contributor.deleteMany({ where: { id: { in: createdIds } } });
  createdIds = [];
  await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
  createdUserIds = [];
});

async function createFixture() {
  const contributor = await prisma.contributor.create({ data: { name: 'Contributor under test' } });
  createdIds.push(contributor.id);
  return contributor;
}

test.each([null, 'coordinator'] as const)('rejects mutations for %s', async (role) => {
  const contributor = await createFixture();
  if (!role) {
    await expect(createContributor('Unauthorized contributor')).rejects.toThrow(
      'NEXT_REDIRECT:/login'
    );
    await expect(deleteContributor(contributor.id)).rejects.toThrow('NEXT_REDIRECT:/login');
    await expect(reorderContributors([contributor.id])).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(await prisma.contributor.findUnique({ where: { id: contributor.id } })).toEqual(
      contributor
    );
    return;
  }
  signInAs(seed.coordinatorId, 'admin');
  expect((await createContributor('Unauthorized contributor')).success).toBe(false);
  expect((await deleteContributor(contributor.id)).success).toBe(false);
  expect((await reorderContributors([contributor.id])).success).toBe(false);
  expect(await prisma.contributor.findUnique({ where: { id: contributor.id } })).toEqual(
    contributor
  );
  expect(
    await prisma.contributor.findFirst({ where: { name: 'Unauthorized contributor' } })
  ).toBeNull();
});

test('persists the public order and appends newly created contributors', async () => {
  signInAs(seed.adminId, 'admin');
  const first = await createFixture();
  const second = await prisma.contributor.create({ data: { name: 'Second contributor' } });
  createdIds.push(second.id);
  const ids = (await getContributors()).map(({ id }) => id);
  const reordered = [second.id, ...ids.filter((id) => id !== second.id)];
  expect((await reorderContributors(reordered)).success).toBe(true);
  expect((await getContributors()).map(({ id }) => id)).toEqual(reordered);
  const result = await createContributor('Appended contributor');
  if (!result.success) throw new Error(result.message);
  createdIds.push(result.contributor.id);
  expect((await getContributors()).at(-1)).toEqual(result.contributor);
  expect(
    await prisma.auditLog.count({
      where: { entity: 'contributor', entityId: first.id, action: 'update' },
    })
  ).toBe(1);
});

test('rejects duplicate, incomplete, deleted and stale contributor lists without changing the order', async () => {
  signInAs(seed.adminId, 'admin');
  const first = await createFixture();
  const deleted = await prisma.contributor.create({
    data: { name: 'Deleted contributor', deletedAt: new Date() },
  });
  createdIds.push(deleted.id);
  const before = await getContributors();
  const ids = before.map(({ id }) => id);
  for (const input of [[...ids, first.id], [], [deleted.id], [...ids, 2147483647], ['1'], null]) {
    expect((await reorderContributors(input)).success).toBe(false);
    expect(await getContributors()).toEqual(before);
  }
});

test('publishes a trimmed name and soft deletes it, recording both actions', async () => {
  signInAs(seed.adminId, 'admin');
  const result = await createContributor('  New contributor  ');
  if (!result.success) throw new Error(result.message);
  createdIds.push(result.contributor.id);
  expect(result.contributor.name).toBe('New contributor');
  expect(await getContributors()).toContainEqual(result.contributor);
  expect((await deleteContributor(result.contributor.id)).success).toBe(true);
  expect(await getContributors()).not.toContainEqual(result.contributor);
  const deleted = await prisma.contributor.findUniqueOrThrow({
    where: { id: result.contributor.id },
  });
  expect(deleted.name).toBe(result.contributor.name);
  expect(deleted.deletedAt).toBeInstanceOf(Date);
  const logs = await prisma.auditLog.findMany({
    where: { entity: 'contributor', entityId: result.contributor.id },
    orderBy: { id: 'asc' },
  });
  expect(logs.map(({ action }) => action)).toEqual(['creation', 'deletion']);
});

test('allows publishing a deleted name again while retaining the original row', async () => {
  const contributor = await createFixture();
  signInAs(seed.adminId, 'admin');
  expect((await deleteContributor(contributor.id)).success).toBe(true);
  const result = await createContributor(contributor.name.toUpperCase());
  if (!result.success) throw new Error(result.message);
  createdIds.push(result.contributor.id);
  expect(result.contributor.id).not.toBe(contributor.id);
  expect(await getContributors()).toContainEqual(result.contributor);
  const original = await prisma.contributor.findUniqueOrThrow({ where: { id: contributor.id } });
  expect(original.deletedAt).toBeInstanceOf(Date);
});

test('does not delete or audit an already deleted contributor again', async () => {
  const contributor = await createFixture();
  signInAs(seed.adminId, 'admin');
  expect((await deleteContributor(contributor.id)).success).toBe(true);
  const original = await prisma.contributor.findUniqueOrThrow({ where: { id: contributor.id } });
  expect((await deleteContributor(contributor.id)).success).toBe(false);
  expect(await prisma.contributor.findUnique({ where: { id: contributor.id } })).toEqual(original);
  expect(
    await prisma.auditLog.count({
      where: { entity: 'contributor', entityId: contributor.id, action: 'deletion' },
    })
  ).toBe(1);
});

test('rejects case-insensitive duplicates without changing published contributors', async () => {
  const contributor = await createFixture();
  signInAs(seed.adminId, 'admin');
  const before = await getContributors();
  const result = await createContributor(`  ${contributor.name.toUpperCase()}  `);
  expect(result.success).toBe(false);
  expect(result.message).toContain('Ya existe');
  expect(await getContributors()).toEqual(before);
});

test.each(['', '   ', 'a'.repeat(101), null])('rejects invalid names: %s', async (name) => {
  signInAs(seed.adminId, 'admin');
  const before = await getContributors();
  expect((await createContributor(name)).success).toBe(false);
  expect(await getContributors()).toEqual(before);
});

test.each([0, -1, '1', null])('rejects invalid deletion identifiers: %s', async (id) => {
  signInAs(seed.adminId, 'admin');
  const before = await getContributors();
  expect((await deleteContributor(id)).success).toBe(false);
  expect(await getContributors()).toEqual(before);
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
    const contributor = await createFixture();
    const before = await getContributors();
    await expect(createContributor('Unauthorized contributor')).rejects.toThrow(
      'NEXT_REDIRECT:/login'
    );
    await expect(deleteContributor(contributor.id)).rejects.toThrow('NEXT_REDIRECT:/login');
    await expect(reorderContributors(before.map(({ id }) => id))).rejects.toThrow(
      'NEXT_REDIRECT:/login'
    );
    expect(await getContributors()).toEqual(before);
    expect(await prisma.auditLog.count({ where: { authorId: admin.id } })).toBe(0);
  }
);

test('concurrent creations never commit the same position', async () => {
  signInAs(seed.adminId, 'admin');
  const names = Array.from({ length: 6 }, (_, index) => `Concurrent contributor ${index}`);
  const results = await Promise.all(names.map((name) => createContributor(name)));
  const created = await prisma.contributor.findMany({ where: { name: { in: names } } });
  createdIds.push(...created.map(({ id }) => id));
  expect(created.length).toBeGreaterThan(0);
  expect(created.length).toBe(results.filter(({ success }) => success).length);
  expect(new Set(created.map(({ sortOrder }) => sortOrder)).size).toBe(created.length);
});

test('updates a large order and its audit entries together', async () => {
  signInAs(seed.adminId, 'admin');
  const created = await prisma.contributor.createManyAndReturn({
    data: Array.from({ length: 100 }, (_, index) => ({
      name: `Bulk contributor ${index}`,
      sortOrder: index + 1,
    })),
  });
  createdIds.push(...created.map(({ id }) => id));
  const order = [...created].reverse().map(({ id }) => id);
  expect((await reorderContributors(order)).success).toBe(true);
  expect((await getContributors()).map(({ id }) => id)).toEqual(order);
  const changed = created.filter(({ id, sortOrder }) => order.indexOf(id) !== sortOrder);
  const logs = await prisma.auditLog.findMany({
    where: { entity: 'contributor', entityId: { in: createdIds }, action: 'update' },
  });
  expect(logs).toHaveLength(changed.length);
  for (const contributor of changed) {
    expect(logs.find(({ entityId }) => entityId === contributor.id)?.details).toEqual({
      sortOrder: { from: contributor.sortOrder, to: order.indexOf(contributor.id) },
    });
  }
});
