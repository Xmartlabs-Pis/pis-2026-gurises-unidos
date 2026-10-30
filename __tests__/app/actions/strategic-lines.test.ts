import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createStrategicLine: vi.fn(),
  findStrategicLine: vi.fn(),
  reactivateStrategicLine: vi.fn(),
  updateStrategicLine: vi.fn(),
  countProjects: vi.fn(),
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth/require-user', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: mocks.transaction,
    strategicLine: {
      create: mocks.createStrategicLine,
      findFirst: mocks.findStrategicLine,
      update: mocks.updateStrategicLine,
      updateMany: mocks.reactivateStrategicLine,
    },
    project: { count: mocks.countProjects },
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import { createStrategicLine, deleteStrategicLine } from '@/app/actions/strategic-lines';

const EMPTY_STATE = {};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ id: 1, role: 'admin' });
  mocks.countProjects.mockResolvedValue(0);
  mocks.createStrategicLine.mockResolvedValue({ id: 1 });
  mocks.findStrategicLine.mockResolvedValue(null);
  mocks.reactivateStrategicLine.mockResolvedValue({ count: 0 });
  mocks.updateStrategicLine.mockResolvedValue({ id: 1 });
  mocks.queryRaw.mockResolvedValue([]);
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      $queryRaw: mocks.queryRaw,
      project: { count: mocks.countProjects },
      strategicLine: { update: mocks.updateStrategicLine },
    })
  );
});

describe('createStrategicLine', () => {
  test('creates an active strategic line and refreshes affected routes', async () => {
    const data = new FormData();
    data.set('name', ' Community Development ');

    await expect(createStrategicLine(EMPTY_STATE, data)).resolves.toEqual({ success: true });

    expect(mocks.createStrategicLine).toHaveBeenCalledWith({
      data: { name: 'Community Development', isActive: true },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/management/strategic-lines');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard/projects', 'layout');
  });

  test('reactivates an inactive strategic line with the same name', async () => {
    mocks.reactivateStrategicLine.mockResolvedValue({ count: 1 });
    const data = new FormData();
    data.set('name', 'community development');

    await expect(createStrategicLine(EMPTY_STATE, data)).resolves.toEqual({ success: true });

    expect(mocks.reactivateStrategicLine).toHaveBeenCalledWith({
      where: {
        name: { equals: 'community development', mode: 'insensitive' },
        isActive: false,
      },
      data: { isActive: true },
    });
    expect(mocks.createStrategicLine).not.toHaveBeenCalled();
  });

  test('returns field errors and preserves the submitted value for invalid names', async () => {
    const data = new FormData();
    data.set('name', '   ');

    await expect(createStrategicLine(EMPTY_STATE, data)).resolves.toEqual({
      errors: { name: ['Ingresá un nombre para la línea estratégica'] },
      values: { name: '   ' },
    });
    expect(mocks.createStrategicLine).not.toHaveBeenCalled();
  });

  test('rejects creation by a non-administrator', async () => {
    mocks.requireUser.mockResolvedValue({ id: 2, role: 'coordinator' });

    await expect(createStrategicLine(EMPTY_STATE, new FormData())).resolves.toEqual({
      formError: 'No tenés permisos para realizar esta acción.',
    });
    expect(mocks.createStrategicLine).not.toHaveBeenCalled();
  });
});

describe('deleteStrategicLine', () => {
  test('deletes a strategic line only when no active projects use it', async () => {
    await expect(deleteStrategicLine(4)).resolves.toEqual({ success: true });

    expect(mocks.queryRaw).toHaveBeenCalled();
    expect(mocks.countProjects).toHaveBeenCalledWith({
      where: { deletedAt: null, strategicLines: { some: { id: 4 } } },
    });
    expect(mocks.updateStrategicLine).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { isActive: false },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/management/strategic-lines');
  });

  test('does not delete a strategic line associated with active projects', async () => {
    mocks.countProjects.mockResolvedValue(1);

    await expect(deleteStrategicLine(4)).resolves.toEqual({
      formError: 'No se puede eliminar una línea estratégica asociada a proyectos.',
    });
    expect(mocks.updateStrategicLine).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test('rejects deletion by a non-administrator', async () => {
    mocks.requireUser.mockResolvedValue({ id: 2, role: 'coordinator' });

    await expect(deleteStrategicLine(4)).resolves.toEqual({
      formError: 'No tenés permisos para realizar esta acción.',
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
});
