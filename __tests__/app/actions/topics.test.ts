import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createTopic: vi.fn(),
  findTopic: vi.fn(),
  reactivateTopic: vi.fn(),
  updateTopic: vi.fn(),
  countProjects: vi.fn(),
  transaction: vi.fn(),
  queryRaw: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth/require-user', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: mocks.transaction,
    topic: {
      create: mocks.createTopic,
      findFirst: mocks.findTopic,
      update: mocks.updateTopic,
      updateMany: mocks.reactivateTopic,
    },
    project: { count: mocks.countProjects },
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import { createTopic, deleteTopic, editTopic } from '@/app/actions/topics';

const EMPTY_STATE = {};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ id: 1, role: 'admin' });
  mocks.countProjects.mockResolvedValue(0);
  mocks.createTopic.mockResolvedValue({ id: 1 });
  mocks.reactivateTopic.mockResolvedValue({ count: 0 });
  mocks.findTopic.mockResolvedValue(null);
  mocks.updateTopic.mockResolvedValue({ id: 1 });
  mocks.queryRaw.mockResolvedValue([]);
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      $queryRaw: mocks.queryRaw,
      project: { count: mocks.countProjects },
      topic: { findFirst: mocks.findTopic, update: mocks.updateTopic },
    })
  );
});

describe('createTopic', () => {
  test('creates an active topic and refreshes affected routes', async () => {
    const data = new FormData();
    data.set('name', ' Education ');

    await expect(createTopic(EMPTY_STATE, data)).resolves.toEqual({ success: true });

    expect(mocks.createTopic).toHaveBeenCalledWith({
      data: { name: 'Education', isActive: true },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/management/topics');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard/projects', 'layout');
  });

  test('reactivates an inactive topic with the same name', async () => {
    mocks.reactivateTopic.mockResolvedValue({ count: 1 });
    const data = new FormData();
    data.set('name', 'Education');

    await expect(createTopic(EMPTY_STATE, data)).resolves.toEqual({ success: true });

    expect(mocks.reactivateTopic).toHaveBeenCalledWith({
      where: { name: { equals: 'Education', mode: 'insensitive' }, isActive: false },
      data: { isActive: true },
    });
    expect(mocks.createTopic).not.toHaveBeenCalled();
  });

  test('rejects a name that already exists with different casing', async () => {
    mocks.findTopic.mockResolvedValue({ id: 2 });
    const data = new FormData();
    data.set('name', 'education');

    await expect(createTopic(EMPTY_STATE, data)).resolves.toEqual({
      formError: 'Ya existe una temática con ese nombre.',
      values: { name: 'education' },
    });

    expect(mocks.findTopic).toHaveBeenCalledWith({
      where: { name: { equals: 'education', mode: 'insensitive' } },
    });
    expect(mocks.createTopic).not.toHaveBeenCalled();
  });
});

describe('editTopic', () => {
  test('renames a topic and refreshes affected routes', async () => {
    const data = new FormData();
    data.set('name', 'Health');

    await expect(editTopic(4, EMPTY_STATE, data)).resolves.toEqual({ success: true });

    expect(mocks.updateTopic).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { name: 'Health' },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/management/topics');
  });

  test('rejects a name used by another topic with different casing', async () => {
    mocks.findTopic.mockResolvedValue({ id: 2 });
    const data = new FormData();
    data.set('name', 'HEALTH');

    await expect(editTopic(4, EMPTY_STATE, data)).resolves.toEqual({
      formError: 'Ya existe una temática con ese nombre.',
      values: { name: 'HEALTH' },
    });

    expect(mocks.findTopic).toHaveBeenCalledWith({
      where: { id: { not: 4 }, name: { equals: 'HEALTH', mode: 'insensitive' } },
      select: { id: true },
    });
    expect(mocks.updateTopic).not.toHaveBeenCalled();
  });
});

describe('deleteTopic', () => {
  test('deactivates a topic only when it has no associated projects', async () => {
    await expect(deleteTopic(4)).resolves.toEqual({ success: true });

    expect(mocks.countProjects).toHaveBeenCalledWith({
      where: { topics: { some: { id: 4 } }, deletedAt: null },
    });
    expect(mocks.updateTopic).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { isActive: false },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/management/topics');
  });

  test('deactivates a topic associated only with deleted projects', async () => {
    mocks.countProjects.mockResolvedValue(0);

    await expect(deleteTopic(4)).resolves.toEqual({ success: true });

    expect(mocks.countProjects).toHaveBeenCalledWith({
      where: { topics: { some: { id: 4 } }, deletedAt: null },
    });
    expect(mocks.updateTopic).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { isActive: false },
    });
  });

  test('does not deactivate a topic associated with projects', async () => {
    mocks.countProjects.mockResolvedValue(1);

    await expect(deleteTopic(4)).resolves.toEqual({
      formError: 'No se puede eliminar una temática asociada a proyectos.',
    });

    expect(mocks.updateTopic).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test('rejects deletion by a non-administrator', async () => {
    mocks.requireUser.mockResolvedValue({ id: 2, role: 'coordinator' });

    await expect(deleteTopic(4)).resolves.toEqual({
      formError: 'No tenés permisos para realizar esta acción.',
    });

    expect(mocks.countProjects).not.toHaveBeenCalled();
    expect(mocks.updateTopic).not.toHaveBeenCalled();
  });
});
