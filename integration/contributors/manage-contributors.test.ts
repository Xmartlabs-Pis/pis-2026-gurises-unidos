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

beforeAll(async () => {
  seed = await loadSeedData();
});

afterEach(async () => {
  await prisma.auditLog.deleteMany({
    where: { entity: 'contributor', entityId: { in: createdIds } },
  });
  await prisma.contributor.deleteMany({ where: { id: { in: createdIds } } });
  createdIds = [];
});

async function createFixture() {
  const contributor = await prisma.contributor.create({ data: { name: 'Contributor under test' } });
  createdIds.push(contributor.id);
  return contributor;
}

test.each([null, 'coordinator'] as const)('rejects mutations for %s', async (role) => {
  const contributor = await createFixture();
  if (role) signInAs(seed.coordinatorId, 'coordinator');
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
