import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Prisma } from '@/generated/prisma/client';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  findCategory: vi.fn(),
  aggregateCategories: vi.fn(),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  countValues: vi.fn(),
  audit: vi.fn(),
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth/require-user', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/lib/prisma', () => ({ default: { $transaction: mocks.transaction } }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import {
  createBeneficiaryCategory,
  deleteBeneficiaryCategory,
} from '@/app/actions/beneficiary-categories';

const EMPTY_STATE = {};

function nameFormData(name: string) {
  const data = new FormData();
  data.set('name', name);
  return data;
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ id: 1, role: 'admin' });
  mocks.findCategory.mockResolvedValue(null);
  mocks.aggregateCategories.mockResolvedValue({ _max: { sortOrder: 7 } });
  mocks.createCategory.mockImplementation(async ({ data }) => ({ id: 8, name: data.name }));
  mocks.updateCategory.mockResolvedValue({ id: 5, name: 'Volunteers' });
  mocks.countValues.mockResolvedValue(0);
  mocks.queryRaw.mockResolvedValue([]);
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      $queryRaw: mocks.queryRaw,
      beneficiaryCategory: {
        findFirst: mocks.findCategory,
        aggregate: mocks.aggregateCategories,
        create: mocks.createCategory,
        update: mocks.updateCategory,
      },
      projectBeneficiaryValue: { count: mocks.countValues },
      auditLog: { create: mocks.audit },
    })
  );
});

describe('createBeneficiaryCategory', () => {
  test('rejects a non-administrator', async () => {
    mocks.requireUser.mockResolvedValue({ id: 2, role: 'coordinator' });

    await expect(
      createBeneficiaryCategory(EMPTY_STATE, nameFormData('Volunteers'))
    ).resolves.toEqual({ formError: 'No tenés permisos para realizar esta acción.' });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  test.each([
    ['   ', 'Ingresá un nombre para la categoría'],
    ['a'.repeat(51), 'El nombre no puede superar los 50 caracteres'],
  ])('rejects the invalid name %#', async (name, message) => {
    await expect(createBeneficiaryCategory(EMPTY_STATE, nameFormData(name))).resolves.toEqual({
      errors: { name: [message] },
      values: { name },
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test('creates a custom category after the last one and audits it', async () => {
    await expect(
      createBeneficiaryCategory(EMPTY_STATE, nameFormData(' Volunteers '))
    ).resolves.toEqual({ success: true });

    expect(mocks.findCategory).toHaveBeenCalledWith({
      where: { name: { equals: 'Volunteers', mode: 'insensitive' } },
      select: { id: true, isActive: true, isSystem: true },
    });
    expect(mocks.createCategory).toHaveBeenCalledWith({
      data: {
        key: expect.stringMatching(/^custom[0-9a-f]{32}$/),
        name: 'Volunteers',
        sortOrder: 8,
        createdBy: 1,
      },
    });
    expect(mocks.updateCategory).not.toHaveBeenCalled();
    expect(mocks.audit).toHaveBeenCalledExactlyOnceWith({
      data: {
        authorId: 1,
        action: 'creation',
        entity: 'beneficiaryCategory',
        entityId: 8,
        details: { name: 'Volunteers' },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  test('starts the sort order at one when there are no categories', async () => {
    mocks.aggregateCategories.mockResolvedValue({ _max: { sortOrder: null } });

    await createBeneficiaryCategory(EMPTY_STATE, nameFormData('Volunteers'));

    expect(mocks.createCategory).toHaveBeenCalledWith({
      data: expect.objectContaining({ sortOrder: 1 }),
    });
  });

  test('reactivates an inactive custom category with the same name in any case', async () => {
    mocks.findCategory.mockResolvedValue({ id: 5, isActive: false, isSystem: false });

    await expect(
      createBeneficiaryCategory(EMPTY_STATE, nameFormData('volunteers'))
    ).resolves.toEqual({ success: true });

    expect(mocks.updateCategory).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { isActive: true, sortOrder: 8 },
    });
    expect(mocks.createCategory).not.toHaveBeenCalled();
    expect(mocks.audit).toHaveBeenCalledExactlyOnceWith({
      data: {
        authorId: 1,
        action: 'creation',
        entity: 'beneficiaryCategory',
        entityId: 5,
        details: { name: 'Volunteers' },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalled();
  });

  test.each([
    { isActive: true, isSystem: false },
    { isActive: true, isSystem: true },
  ])('rejects a name that only differs in case from an existing category %o', async (found) => {
    mocks.findCategory.mockResolvedValue({ id: 4, ...found });

    await expect(createBeneficiaryCategory(EMPTY_STATE, nameFormData('familias'))).resolves.toEqual(
      {
        formError: 'Ya existe una categoría con ese nombre.',
        values: { name: 'familias' },
      }
    );

    expect(mocks.createCategory).not.toHaveBeenCalled();
    expect(mocks.updateCategory).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test('reports a duplicate name without revalidating', async () => {
    mocks.createCategory.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
        code: 'P2002',
        clientVersion: '6',
      })
    );

    await expect(createBeneficiaryCategory(EMPTY_STATE, nameFormData('Familias'))).resolves.toEqual(
      {
        formError: 'Ya existe una categoría con ese nombre.',
        values: { name: 'Familias' },
      }
    );

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test('reports unexpected failures without revalidating', async () => {
    mocks.transaction.mockRejectedValue(new Error('Connection lost'));

    await expect(
      createBeneficiaryCategory(EMPTY_STATE, nameFormData('Volunteers'))
    ).resolves.toEqual({
      formError: 'No se pudo crear la categoría. Intentá de nuevo.',
      values: { name: 'Volunteers' },
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe('deleteBeneficiaryCategory', () => {
  beforeEach(() => {
    mocks.findCategory.mockResolvedValue({ name: 'Volunteers', isSystem: false });
  });

  test('rejects a non-administrator', async () => {
    mocks.requireUser.mockResolvedValue({ id: 2, role: 'coordinator' });

    await expect(deleteBeneficiaryCategory(5)).resolves.toEqual({
      formError: 'No tenés permisos para realizar esta acción.',
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  test.each([0, -1, 1.5, NaN])('rejects the invalid id %s', async (id) => {
    await expect(deleteBeneficiaryCategory(id)).resolves.toEqual({
      formError: 'La categoría no es válida.',
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  test.each([
    ['missing or inactive', null, 0, 'La categoría no existe o ya fue eliminada.'],
    [
      'a system category',
      { name: 'Familias', isSystem: true },
      0,
      'Las categorías del sistema no se pueden eliminar.',
    ],
    [
      'in use',
      { name: 'Volunteers', isSystem: false },
      2,
      'No se puede eliminar una categoría con valores cargados en proyectos.',
    ],
  ])('rejects a category that is %s', async (_case, category, usage, message) => {
    mocks.findCategory.mockResolvedValue(category);
    mocks.countValues.mockResolvedValue(usage);

    await expect(deleteBeneficiaryCategory(5)).resolves.toEqual({ formError: message });

    expect(mocks.updateCategory).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test('deactivates an unused custom category and audits it', async () => {
    await expect(deleteBeneficiaryCategory(5)).resolves.toEqual({ success: true });

    expect(mocks.queryRaw).toHaveBeenCalledWith(expect.anything(), 5);
    expect(mocks.findCategory).toHaveBeenCalledWith({
      where: { id: 5, isActive: true },
      select: { name: true, isSystem: true },
    });
    expect(mocks.countValues).toHaveBeenCalledWith({
      where: { categoryId: 5, value: { gt: 0 }, beneficiary: { project: { deletedAt: null } } },
    });
    expect(mocks.updateCategory).toHaveBeenCalledWith({
      where: { id: 5 },
      data: { isActive: false },
    });
    expect(mocks.audit).toHaveBeenCalledExactlyOnceWith({
      data: {
        authorId: 1,
        action: 'deletion',
        entity: 'beneficiaryCategory',
        entityId: 5,
        details: { name: 'Volunteers' },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });

  test('reports unexpected failures without revalidating', async () => {
    mocks.updateCategory.mockRejectedValue(new Error('Connection lost'));

    await expect(deleteBeneficiaryCategory(5)).resolves.toEqual({
      formError: 'No se pudo eliminar la categoría. Intentá de nuevo.',
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
