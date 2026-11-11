import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createStrategicLine: vi.fn(),
  findStrategicLine: vi.fn(),
  updateStrategicLine: vi.fn(),
  reactivateStrategicLine: vi.fn(),
  createAuditLog: vi.fn(),
  countProjects: vi.fn(),
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth/require-user', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/lib/prisma', () => ({
  default: { $transaction: mocks.transaction },
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import {
  createStrategicLine,
  deleteStrategicLine,
  editStrategicLine,
} from '@/app/actions/strategic-lines';

const EMPTY_STATE = {};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ id: 1, role: 'admin' });
  mocks.countProjects.mockResolvedValue(0);
  mocks.createStrategicLine.mockResolvedValue({ id: 1, name: 'Community Development' });
  mocks.findStrategicLine.mockResolvedValue(null);
  mocks.updateStrategicLine.mockResolvedValue({ id: 1 });
  mocks.queryRaw.mockResolvedValue([]);
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      $queryRaw: mocks.queryRaw,
      project: { count: mocks.countProjects },
      strategicLine: {
        create: mocks.createStrategicLine,
        findFirst: mocks.findStrategicLine,
        update: mocks.updateStrategicLine,
        updateMany: mocks.reactivateStrategicLine,
      },
      auditLog: { create: mocks.createAuditLog },
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
    expect(mocks.createAuditLog).toHaveBeenCalledWith({
      data: {
        authorId: 1,
        action: 'creation',
        entity: 'strategicLine',
        entityId: 1,
        details: { name: 'Community Development' },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/management/strategic-lines');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard/projects', 'layout');
  });

  test('reactivates an inactive strategic line with the same name', async () => {
    mocks.findStrategicLine.mockResolvedValue({
      id: 3,
      name: 'Community Development',
      isActive: false,
    });
    mocks.reactivateStrategicLine.mockResolvedValue({ count: 1 });
    const data = new FormData();
    data.set('name', 'community development');

    await expect(createStrategicLine(EMPTY_STATE, data)).resolves.toEqual({ success: true });

    expect(mocks.findStrategicLine).toHaveBeenCalledWith({
      where: { name: { equals: 'community development', mode: 'insensitive' } },
    });
    expect(mocks.reactivateStrategicLine).toHaveBeenCalledWith({
      where: { id: 3, isActive: false },
      data: { isActive: true },
    });
    expect(mocks.createStrategicLine).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).toHaveBeenCalledWith({
      data: {
        authorId: 1,
        action: 'creation',
        entity: 'strategicLine',
        entityId: 3,
        details: { name: 'Community Development' },
      },
    });
  });

  test('does not record a second creation when another request reactivated the line first', async () => {
    mocks.findStrategicLine.mockResolvedValue({
      id: 3,
      name: 'Community Development',
      isActive: false,
    });
    mocks.reactivateStrategicLine.mockResolvedValue({ count: 0 });
    const data = new FormData();
    data.set('name', 'community development');

    await expect(createStrategicLine(EMPTY_STATE, data)).resolves.toEqual({
      formError: 'Ya existe una línea estratégica con ese nombre.',
      values: { name: 'community development' },
    });
    expect(mocks.createStrategicLine).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  test('rejects a name used by an active strategic line', async () => {
    mocks.findStrategicLine.mockResolvedValue({ id: 3, isActive: true });
    const data = new FormData();
    data.set('name', 'community development');

    await expect(createStrategicLine(EMPTY_STATE, data)).resolves.toEqual({
      formError: 'Ya existe una línea estratégica con ese nombre.',
      values: { name: 'community development' },
    });
    expect(mocks.createStrategicLine).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
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

describe('editStrategicLine', () => {
  test('renames an active strategic line and records the audit event', async () => {
    mocks.findStrategicLine.mockResolvedValueOnce({ name: 'Youth Support' });
    const data = new FormData();
    data.set('name', 'Youth Development');

    await expect(editStrategicLine(4, EMPTY_STATE, data)).resolves.toEqual({ success: true });

    expect(mocks.updateStrategicLine).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { name: 'Youth Development' },
    });
    expect(mocks.createAuditLog).toHaveBeenCalledWith({
      data: {
        authorId: 1,
        action: 'update',
        entity: 'strategicLine',
        entityId: 4,
        details: { previousName: 'Youth Support', name: 'Youth Development' },
      },
    });
  });

  test('explains when the requested name belongs to an inactive strategic line', async () => {
    mocks.findStrategicLine.mockResolvedValueOnce({ name: 'Youth Support' });
    mocks.findStrategicLine.mockResolvedValueOnce({ id: 8, isActive: false });
    const data = new FormData();
    data.set('name', 'Youth Development');

    await expect(editStrategicLine(4, EMPTY_STATE, data)).resolves.toEqual({
      formError: 'Ese nombre pertenece a una línea estratégica dada de baja. Elegí otro nombre.',
      values: { name: 'Youth Development' },
    });

    expect(mocks.updateStrategicLine).not.toHaveBeenCalled();
  });

  test('rejects a name already used by another active strategic line', async () => {
    mocks.findStrategicLine.mockResolvedValueOnce({ name: 'Youth Support' });
    mocks.findStrategicLine.mockResolvedValueOnce({ id: 8, isActive: true });
    const data = new FormData();
    data.set('name', 'Youth Development');

    await expect(editStrategicLine(4, EMPTY_STATE, data)).resolves.toEqual({
      formError: 'Ya existe una línea estratégica con ese nombre.',
      values: { name: 'Youth Development' },
    });

    expect(mocks.updateStrategicLine).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  test('rejects editing a strategic line that does not exist or is inactive', async () => {
    const data = new FormData();
    data.set('name', 'Youth Development');

    await expect(editStrategicLine(4, EMPTY_STATE, data)).resolves.toEqual({
      formError: 'La línea estratégica no existe o ya fue eliminada.',
      values: { name: 'Youth Development' },
    });

    expect(mocks.updateStrategicLine).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });
});

describe('deleteStrategicLine', () => {
  beforeEach(() => {
    mocks.findStrategicLine.mockResolvedValue({ name: 'Youth Support' });
  });

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
    expect(mocks.createAuditLog).toHaveBeenCalledWith({
      data: {
        authorId: 1,
        action: 'deletion',
        entity: 'strategicLine',
        entityId: 4,
        details: { name: 'Youth Support' },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/management/strategic-lines');
  });

  test('does not delete a strategic line associated with active projects', async () => {
    mocks.countProjects.mockResolvedValue(1);

    await expect(deleteStrategicLine(4)).resolves.toEqual({
      formError: 'No se puede eliminar una línea estratégica asociada a proyectos.',
    });
    expect(mocks.updateStrategicLine).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test('explains that an already inactive strategic line was deleted without recording it again', async () => {
    mocks.findStrategicLine.mockResolvedValue(null);

    await expect(deleteStrategicLine(4)).resolves.toEqual({
      formError: 'La línea estratégica no existe o ya fue eliminada.',
    });
    expect(mocks.findStrategicLine).toHaveBeenCalledWith({
      where: { id: 4, isActive: true },
      select: { name: true },
    });
    expect(mocks.countProjects).not.toHaveBeenCalled();
    expect(mocks.updateStrategicLine).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
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
