import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import {
  createBeneficiaryCategory,
  deleteBeneficiaryCategory,
} from '@/app/actions/beneficiary-categories';
import { updateProject } from '@/app/actions/projects';
import prisma from '@/lib/prisma';
import { loadSeedData, type SeedData } from '../fixtures';
import { signInAs } from '../session';

const BENEFICIARY_YEAR = 2024;
const CATEGORY_NAME = 'Docentes integration';

let seed: SeedData;
let projectIds: number[] = [];

function nameFormData(name: string) {
  const formData = new FormData();
  formData.append('name', name);
  return formData;
}

function projectFormData(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries({
    name: 'Project with custom category',
    status: 'active',
    intensity: 'high',
    counterpartyType: 'publicSector',
    startYear: '2020',
    leadCoordinatorId: String(seed.coordinatorId),
    departmentId: String(seed.departmentIds[0]),
    zone: 'rural',
    topicId: String(seed.topicIds[0]),
    year: String(BENEFICIARY_YEAR),
    ...fields,
  })) {
    formData.append(key, value);
  }
  return formData;
}

async function createProjectFixture() {
  const project = await prisma.project.create({
    data: {
      name: 'Project with custom category',
      status: 'active',
      intensity: 'high',
      counterpartyType: 'publicSector',
      startYear: 2020,
      leadCoordinatorId: seed.coordinatorId,
      departmentId: seed.departmentIds[0],
      zone: 'rural',
      createdBy: seed.adminId,
      topicId: seed.topicIds[0],
    },
  });
  projectIds.push(project.id);
  return project.id;
}

async function createCategory() {
  expect(await createBeneficiaryCategory({}, nameFormData(CATEGORY_NAME))).toEqual({
    success: true,
  });
  return prisma.beneficiaryCategory.findUniqueOrThrow({ where: { name: CATEGORY_NAME } });
}

async function categoryAuditLogs(id: number) {
  return prisma.auditLog.findMany({
    where: { entity: 'beneficiaryCategory', entityId: id },
    orderBy: { id: 'asc' },
    select: { action: true, details: true },
  });
}

beforeAll(async () => {
  seed = await loadSeedData();
});

afterEach(async () => {
  const beneficiaryIds = (
    await prisma.projectBeneficiary.findMany({
      where: { projectId: { in: projectIds } },
      select: { id: true },
    })
  ).map(({ id }) => id);
  const category = await prisma.beneficiaryCategory.findUnique({ where: { name: CATEGORY_NAME } });
  await prisma.$transaction([
    prisma.auditLog.deleteMany({
      where: {
        OR: [
          { entity: 'project', entityId: { in: projectIds } },
          { entity: 'beneficiary', entityId: { in: beneficiaryIds } },
          ...(category ? [{ entity: 'beneficiaryCategory' as const, entityId: category.id }] : []),
        ],
      },
    }),
    prisma.projectBeneficiary.deleteMany({ where: { projectId: { in: projectIds } } }),
    prisma.project.deleteMany({ where: { id: { in: projectIds } } }),
    prisma.beneficiaryCategory.deleteMany({ where: { name: CATEGORY_NAME } }),
  ]);
  projectIds = [];
});

describe('beneficiary categories (integration)', () => {
  test('a new category is saved with project beneficiaries and blocks its deletion', async () => {
    signInAs(seed.adminId);
    const category = await createCategory();
    expect(category).toMatchObject({ isActive: true, isSystem: false, createdBy: seed.adminId });
    expect(category.key).toMatch(/^custom[0-9a-f]{32}$/);

    const projectId = await createProjectFixture();
    await expect(
      updateProject(projectId, {}, projectFormData({ families: '4', [category.key]: '7' }))
    ).rejects.toThrow(`NEXT_REDIRECT:/dashboard/projects/${projectId}`);

    const values = await prisma.projectBeneficiaryValue.findMany({
      where: { beneficiary: { projectId, year: BENEFICIARY_YEAR } },
      select: { value: true, category: { select: { key: true } } },
      orderBy: { categoryId: 'asc' },
    });
    expect(values).toEqual([
      { value: 4, category: { key: 'families' } },
      { value: 7, category: { key: category.key } },
    ]);

    expect(await deleteBeneficiaryCategory(category.id)).toEqual({
      formError: 'No se puede eliminar una categoría con valores cargados en proyectos.',
    });

    await prisma.project.update({ where: { id: projectId }, data: { deletedAt: new Date() } });
    expect(await deleteBeneficiaryCategory(category.id)).toEqual({ success: true });
    expect(
      await prisma.beneficiaryCategory.findUniqueOrThrow({ where: { id: category.id } })
    ).toMatchObject({ isActive: false });
    expect(await categoryAuditLogs(category.id)).toEqual([
      { action: 'creation', details: { name: CATEGORY_NAME } },
      { action: 'deletion', details: { name: CATEGORY_NAME } },
    ]);
  });

  test('recreating a deleted category by name reactivates it', async () => {
    signInAs(seed.adminId);
    const category = await createCategory();
    expect(await deleteBeneficiaryCategory(category.id)).toEqual({ success: true });

    const reactivated = await createCategory();

    expect(reactivated).toMatchObject({ id: category.id, key: category.key, isActive: true });
    expect(await prisma.beneficiaryCategory.count({ where: { name: CATEGORY_NAME } })).toBe(1);
  });

  test('names are compared without case', async () => {
    signInAs(seed.adminId);
    const category = await createCategory();

    expect(await createBeneficiaryCategory({}, nameFormData(CATEGORY_NAME.toUpperCase()))).toEqual({
      formError: 'Ya existe una categoría con ese nombre.',
      values: { name: CATEGORY_NAME.toUpperCase() },
    });

    expect(await deleteBeneficiaryCategory(category.id)).toEqual({ success: true });
    expect(await createBeneficiaryCategory({}, nameFormData(CATEGORY_NAME.toLowerCase()))).toEqual({
      success: true,
    });
    expect(
      await prisma.beneficiaryCategory.findMany({
        where: { name: { equals: CATEGORY_NAME, mode: 'insensitive' } },
        select: { id: true, isActive: true },
      })
    ).toEqual([{ id: category.id, isActive: true }]);
  });

  test('system categories cannot be deleted', async () => {
    signInAs(seed.adminId);
    const families = await prisma.beneficiaryCategory.findUniqueOrThrow({
      where: { key: 'families' },
    });

    expect(await deleteBeneficiaryCategory(families.id)).toEqual({
      formError: 'Las categorías del sistema no se pueden eliminar.',
    });
    expect(
      await prisma.beneficiaryCategory.findUniqueOrThrow({ where: { id: families.id } })
    ).toMatchObject({ isActive: true });
  });

  test('coordinators cannot manage categories', async () => {
    signInAs(seed.coordinatorId);

    expect(await createBeneficiaryCategory({}, nameFormData(CATEGORY_NAME))).toEqual({
      formError: 'No tenés permisos para realizar esta acción.',
    });
    expect(await prisma.beneficiaryCategory.count({ where: { name: CATEGORY_NAME } })).toBe(0);
  });
});
