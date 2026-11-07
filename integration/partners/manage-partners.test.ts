import { afterEach, beforeAll, expect, test } from 'vitest';
import {
  createPartner,
  deletePartner,
  editPartner,
  placePartner,
  reorderPartners,
  setPartnerVisibility,
} from '@/app/actions/partners';
import { getManagedPartners, getMetricsPartners, getPublicPartners } from '@/lib/partners';
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

async function createFixture(name = 'Partner under test', isActive = true) {
  const partner = await prisma.partner.create({
    data: { name, counterpartyType: 'publicSector', isActive },
  });
  createdIds.push(partner.id);
  return partner;
}

function buildForm(name: unknown, counterpartyType: unknown = 'privateSector') {
  const formData = new FormData();
  if (name !== null) formData.set('name', String(name));
  if (counterpartyType !== null) formData.set('counterpartyType', String(counterpartyType));
  return formData;
}

async function createThroughAction(name: string, counterpartyType = 'privateSector') {
  const result = await createPartner({}, buildForm(name, counterpartyType));
  const partner = await prisma.partner.findFirst({
    where: { name: { equals: name.trim(), mode: 'insensitive' } },
  });
  if (partner && !createdIds.includes(partner.id)) createdIds.push(partner.id);
  return { result, partner };
}

test.each([null, 'coordinator'] as const)('rejects mutations for %s', async (role) => {
  const partner = await createFixture();
  const placement = { id: partner.id, showPublicly: false, order: [partner.id] };
  if (!role) {
    const redirect = 'NEXT_REDIRECT:/login';
    await expect(createPartner({}, buildForm('Unauthorized partner'))).rejects.toThrow(redirect);
    await expect(editPartner(partner.id, {}, buildForm('Renamed'))).rejects.toThrow(redirect);
    await expect(deletePartner(partner.id)).rejects.toThrow(redirect);
    await expect(reorderPartners([partner.id])).rejects.toThrow(redirect);
    await expect(placePartner(placement)).rejects.toThrow(redirect);
    await expect(setPartnerVisibility(partner.id, false)).rejects.toThrow(redirect);
    expect(await prisma.partner.findUnique({ where: { id: partner.id } })).toEqual(partner);
    return;
  }
  signInAs(seed.coordinatorId, 'admin');
  expect((await createPartner({}, buildForm('Unauthorized partner'))).success).toBeFalsy();
  expect((await editPartner(partner.id, {}, buildForm('Renamed'))).success).toBeFalsy();
  expect((await deletePartner(partner.id)).success).toBeFalsy();
  expect((await reorderPartners([partner.id])).success).toBe(false);
  expect((await placePartner(placement)).success).toBe(false);
  expect((await setPartnerVisibility(partner.id, false)).success).toBe(false);
  expect(await prisma.partner.findUnique({ where: { id: partner.id } })).toEqual(partner);
  expect(await prisma.partner.findFirst({ where: { name: 'Unauthorized partner' } })).toBeNull();
});

test('persists the public order and appends newly created partners', async () => {
  signInAs(seed.adminId, 'admin');
  await createFixture();
  const second = await createFixture('Second partner');
  const ids = (await getMetricsPartners()).map(({ id }) => id);
  const reordered = [second.id, ...ids.filter((id) => id !== second.id)];
  expect((await reorderPartners(reordered)).success).toBe(true);
  expect((await getMetricsPartners()).map(({ id }) => id)).toEqual(reordered);
  const { result, partner } = await createThroughAction('Appended partner');
  expect(result.success).toBe(true);
  expect((await getMetricsPartners()).at(-1)?.id).toBe(partner?.id);
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
  const deleted = await createFixture('Deleted partner', false);
  const before = await getMetricsPartners();
  const ids = before.map(({ id }) => id);
  for (const input of [[...ids, first.id], [], [deleted.id], [...ids, 2147483647], ['1'], null]) {
    expect((await reorderPartners(input)).success).toBe(false);
    expect(await getMetricsPartners()).toEqual(before);
  }
});

test('creates a trimmed partner with its type and deactivates it, recording both actions', async () => {
  signInAs(seed.adminId, 'admin');
  const { result, partner } = await createThroughAction('  New partner  ', 'publicSector');
  expect(result.success).toBe(true);
  expect(partner).toMatchObject({
    name: 'New partner',
    counterpartyType: 'publicSector',
    isActive: true,
    showPublicly: false,
  });
  expect((await getManagedPartners()).map(({ id }) => id)).toContain(partner!.id);
  expect((await getPublicPartners()).map(({ id }) => id)).not.toContain(partner!.id);
  expect((await deletePartner(partner!.id)).success).toBe(true);
  expect((await getManagedPartners()).map(({ id }) => id)).not.toContain(partner!.id);
  const deleted = await prisma.partner.findUniqueOrThrow({ where: { id: partner!.id } });
  expect(deleted.isActive).toBe(false);
  const logs = await prisma.auditLog.findMany({
    where: { entity: 'partner', entityId: partner!.id },
    orderBy: { id: 'asc' },
  });
  expect(logs.map(({ action }) => action)).toEqual(['creation', 'deletion']);
});

test('reactivates a deleted partner with the new type, hidden and at the end', async () => {
  signInAs(seed.adminId, 'admin');
  const partner = await createFixture('Returning partner', false);
  await prisma.partner.update({ where: { id: partner.id }, data: { showPublicly: true } });
  await createFixture('Active partner');
  const { result } = await createThroughAction('RETURNING PARTNER', 'internationalCooperation');
  expect(result.success).toBe(true);
  expect(await prisma.partner.count({ where: { name: { in: ['RETURNING PARTNER'] } } })).toBe(0);
  expect(await prisma.partner.findUniqueOrThrow({ where: { id: partner.id } })).toMatchObject({
    name: 'Returning partner',
    counterpartyType: 'internationalCooperation',
    isActive: true,
    showPublicly: false,
  });
  expect((await getPublicPartners()).map(({ id }) => id)).not.toContain(partner.id);
  expect((await getMetricsPartners()).at(-1)?.id).toBe(partner.id);
});

test('does not delete or audit an already deleted partner again', async () => {
  const partner = await createFixture();
  signInAs(seed.adminId, 'admin');
  expect((await deletePartner(partner.id)).success).toBe(true);
  const original = await prisma.partner.findUniqueOrThrow({ where: { id: partner.id } });
  expect((await deletePartner(partner.id)).success).toBeFalsy();
  expect(await prisma.partner.findUnique({ where: { id: partner.id } })).toEqual(original);
  expect(
    await prisma.auditLog.count({
      where: { entity: 'partner', entityId: partner.id, action: 'deletion' },
    })
  ).toBe(1);
});

test('does not delete a partner associated with a project', async () => {
  signInAs(seed.adminId, 'admin');
  const partner = await createFixture();
  const project = await prisma.project.findFirstOrThrow({ where: { deletedAt: null } });
  await prisma.partner.update({
    where: { id: partner.id },
    data: { projects: { connect: { id: project.id } } },
  });
  const result = await deletePartner(partner.id);
  expect(result.formError).toContain('asociado a proyectos');
  expect(await prisma.partner.findUniqueOrThrow({ where: { id: partner.id } })).toMatchObject({
    isActive: true,
  });
});

test('rejects case-insensitive duplicates without changing partners', async () => {
  const partner = await createFixture();
  signInAs(seed.adminId, 'admin');
  const before = await getManagedPartners();
  const result = await createPartner({}, buildForm(`  ${partner.name.toUpperCase()}  `));
  expect(result.success).toBeFalsy();
  expect(result.formError).toContain('Ya existe');
  expect(await getManagedPartners()).toEqual(before);
});

test.each(['', '   ', 'a'.repeat(101), null])('rejects invalid names: %s', async (name) => {
  signInAs(seed.adminId, 'admin');
  const before = await getManagedPartners();
  const result = await createPartner({}, buildForm(name));
  expect(result.errors?.name).toBeDefined();
  expect(await getManagedPartners()).toEqual(before);
});

test.each(['', 'unknownSector', null])('rejects invalid types: %s', async (counterpartyType) => {
  signInAs(seed.adminId, 'admin');
  const before = await getManagedPartners();
  const result = await createPartner({}, buildForm('Typed partner', counterpartyType));
  expect(result.errors?.counterpartyType).toBeDefined();
  expect(await getManagedPartners()).toEqual(before);
});

test.each([0, -1, '1', null])('rejects invalid deletion identifiers: %s', async (id) => {
  signInAs(seed.adminId, 'admin');
  const before = await getManagedPartners();
  expect((await deletePartner(id as number)).success).toBeFalsy();
  expect(await getManagedPartners()).toEqual(before);
});

test('renames a partner without changing its type and audits the change', async () => {
  signInAs(seed.adminId, 'admin');
  const partner = await createFixture();
  expect(
    (await editPartner(partner.id, {}, buildForm('  Renamed partner  ', 'publicSector'))).success
  ).toBe(true);
  expect(await prisma.partner.findUniqueOrThrow({ where: { id: partner.id } })).toMatchObject({
    name: 'Renamed partner',
    counterpartyType: 'publicSector',
  });
  const log = await prisma.auditLog.findFirstOrThrow({
    where: { entity: 'partner', entityId: partner.id, action: 'update' },
  });
  expect(log.details).toEqual({
    previousName: partner.name,
    name: 'Renamed partner',
    previousCounterpartyType: 'publicSector',
    counterpartyType: 'publicSector',
  });
});

test('changes the type of a partner without projects', async () => {
  signInAs(seed.adminId, 'admin');
  const partner = await createFixture();
  const result = await editPartner(partner.id, {}, buildForm(partner.name, 'privateSector'));
  expect(result.success).toBe(true);
  expect(await prisma.partner.findUniqueOrThrow({ where: { id: partner.id } })).toMatchObject({
    name: partner.name,
    counterpartyType: 'privateSector',
  });
});

test('rejects changing the type of a partner with projects but allows renaming it', async () => {
  signInAs(seed.adminId, 'admin');
  const partner = await createFixture();
  const project = await prisma.project.findFirstOrThrow({ where: { deletedAt: null } });
  await prisma.partner.update({
    where: { id: partner.id },
    data: { projects: { connect: { id: project.id } } },
  });
  const result = await editPartner(partner.id, {}, buildForm(partner.name, 'privateSector'));
  expect(result.formError).toContain('asociado a proyectos');
  expect(await prisma.partner.findUniqueOrThrow({ where: { id: partner.id } })).toMatchObject({
    counterpartyType: 'publicSector',
  });
  const renamed = await editPartner(partner.id, {}, buildForm('Renamed', 'publicSector'));
  expect(renamed.success).toBe(true);
});

test.each(['', 'unknownSector', null])(
  'rejects editing with an invalid type: %s',
  async (counterpartyType) => {
    signInAs(seed.adminId, 'admin');
    const partner = await createFixture();
    const result = await editPartner(partner.id, {}, buildForm('Renamed', counterpartyType));
    expect(result.errors?.counterpartyType).toBeDefined();
    expect(await prisma.partner.findUnique({ where: { id: partner.id } })).toEqual(partner);
  }
);

test('rejects renaming to the name of an active or deleted partner', async () => {
  signInAs(seed.adminId, 'admin');
  const partner = await createFixture();
  const active = await createFixture('Active partner');
  const deleted = await createFixture('Deleted partner', false);
  const duplicate = await editPartner(partner.id, {}, buildForm(active.name.toUpperCase()));
  expect(duplicate.formError).toContain('Ya existe');
  const inactive = await editPartner(partner.id, {}, buildForm(deleted.name));
  expect(inactive.formError).toContain('dado de baja');
  expect(await prisma.partner.findUnique({ where: { id: partner.id } })).toEqual(partner);
});

test('hides a partner from the public site but keeps it in metrics', async () => {
  signInAs(seed.adminId, 'admin');
  const partner = await createFixture();
  expect((await setPartnerVisibility(partner.id, false)).success).toBe(true);
  expect((await getPublicPartners()).map(({ id }) => id)).not.toContain(partner.id);
  expect(await getMetricsPartners()).toContainEqual({
    id: partner.id,
    name: partner.name,
    showPublicly: false,
  });
  expect((await setPartnerVisibility(partner.id, true)).success).toBe(true);
  expect((await getPublicPartners()).map(({ id }) => id)).toContain(partner.id);
});

test('does not change the visibility of a deleted partner', async () => {
  signInAs(seed.adminId, 'admin');
  const partner = await createFixture('Deleted partner', false);
  expect((await setPartnerVisibility(partner.id, false)).success).toBe(false);
  expect(await prisma.partner.findUnique({ where: { id: partner.id } })).toEqual(partner);
});

test('moves a partner between zones saving visibility and order together', async () => {
  signInAs(seed.adminId, 'admin');
  const hidden = await createFixture('Hidden partner');
  await prisma.partner.update({ where: { id: hidden.id }, data: { showPublicly: false } });
  const visible = await createFixture('Visible partner');
  const others = (await getMetricsPartners())
    .map(({ id }) => id)
    .filter((id) => id !== hidden.id && id !== visible.id);
  const order = [hidden.id, visible.id, ...others];
  expect((await placePartner({ id: hidden.id, showPublicly: true, order })).success).toBe(true);
  expect((await getMetricsPartners()).map(({ id }) => id)).toEqual(order);
  expect((await getPublicPartners())[0].id).toBe(hidden.id);
});

test('does not change visibility when the order of a placement is stale', async () => {
  signInAs(seed.adminId, 'admin');
  const partner = await createFixture();
  const before = await getMetricsPartners();
  const result = await placePartner({
    id: partner.id,
    showPublicly: false,
    order: [partner.id, 0],
  });
  expect(result.success).toBe(false);
  const stale = await placePartner({ id: partner.id, showPublicly: false, order: [2147483647] });
  expect(stale.success).toBe(false);
  expect(await getMetricsPartners()).toEqual(before);
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
    const before = await getMetricsPartners();
    const redirect = 'NEXT_REDIRECT:/login';
    await expect(createPartner({}, buildForm('Unauthorized partner'))).rejects.toThrow(redirect);
    await expect(deletePartner(partner.id)).rejects.toThrow(redirect);
    await expect(reorderPartners(before.map(({ id }) => id))).rejects.toThrow(redirect);
    expect(await getMetricsPartners()).toEqual(before);
    expect(await prisma.auditLog.count({ where: { authorId: admin.id } })).toBe(0);
  }
);

test('concurrent creations never commit the same position', async () => {
  signInAs(seed.adminId, 'admin');
  const names = Array.from({ length: 6 }, (_, index) => `Concurrent partner ${index}`);
  const results = await Promise.all(names.map((name) => createPartner({}, buildForm(name))));
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
      counterpartyType: 'publicSector' as const,
      sortOrder: index + 1,
    })),
  });
  createdIds.push(...created.map(({ id }) => id));
  const order = [...created].reverse().map(({ id }) => id);
  expect((await reorderPartners(order)).success).toBe(true);
  expect((await getMetricsPartners()).map(({ id }) => id)).toEqual(order);
  expect(
    await prisma.auditLog.count({
      where: { entity: 'partner', entityId: null, action: 'update' },
    })
  ).toBe(1);
});
