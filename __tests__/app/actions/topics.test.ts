import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Prisma } from '@/generated/prisma/client';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  createTopic: vi.fn(),
  findTopic: vi.fn(),
  updateTopic: vi.fn(),
  reactivateTopic: vi.fn(),
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

import { createTopic, deleteTopic, editTopic } from '@/app/actions/topics';

const EMPTY_STATE = {};

function nameForm(name: string) {
  const data = new FormData();
  data.set('name', name);
  return data;
}

function uniqueNameError() {
  return new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: '6',
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireUser.mockResolvedValue({ id: 1, role: 'admin' });
  mocks.countProjects.mockResolvedValue(0);
  mocks.createTopic.mockResolvedValue({ id: 1, name: 'Education' });
  mocks.findTopic.mockResolvedValue(null);
  mocks.updateTopic.mockResolvedValue({ id: 1 });
  mocks.queryRaw.mockResolvedValue([]);
  mocks.transaction.mockImplementation(async (callback) =>
    callback({
      $queryRaw: mocks.queryRaw,
      project: { count: mocks.countProjects },
      topic: {
        create: mocks.createTopic,
        findFirst: mocks.findTopic,
        update: mocks.updateTopic,
        updateMany: mocks.reactivateTopic,
      },
      auditLog: { create: mocks.createAuditLog },
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
    expect(mocks.createAuditLog).toHaveBeenCalledWith({
      data: {
        authorId: 1,
        action: 'creation',
        entity: 'topic',
        entityId: 1,
        details: { name: 'Education' },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/management/topics');
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/dashboard/projects', 'layout');
  });

  test('reactivates an inactive topic with the same name', async () => {
    mocks.findTopic.mockResolvedValue({ id: 3, name: 'Education', isActive: false });
    mocks.reactivateTopic.mockResolvedValue({ count: 1 });
    const data = new FormData();
    data.set('name', 'Education');

    await expect(createTopic(EMPTY_STATE, data)).resolves.toEqual({ success: true });

    expect(mocks.reactivateTopic).toHaveBeenCalledWith({
      where: { id: 3, isActive: false },
      data: { isActive: true },
    });
    expect(mocks.createTopic).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).toHaveBeenCalledWith({
      data: {
        authorId: 1,
        action: 'creation',
        entity: 'topic',
        entityId: 3,
        details: { name: 'Education' },
      },
    });
  });

  test('does not record a second creation when another request reactivated the topic first', async () => {
    mocks.findTopic.mockResolvedValue({ id: 3, name: 'Education', isActive: false });
    mocks.reactivateTopic.mockResolvedValue({ count: 0 });
    const data = new FormData();
    data.set('name', 'Education');

    await expect(createTopic(EMPTY_STATE, data)).resolves.toEqual({
      formError: 'Ya existe una temática con ese nombre.',
      values: { name: 'Education' },
    });
    expect(mocks.createTopic).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  test('rejects a name that already exists with different casing', async () => {
    mocks.findTopic.mockResolvedValue({ id: 2, isActive: true });
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
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  test('rejects creation by a non-administrator', async () => {
    mocks.requireUser.mockResolvedValue({ id: 2, role: 'coordinator' });

    await expect(createTopic(EMPTY_STATE, nameForm('Education'))).resolves.toEqual({
      formError: 'No tenés permisos para realizar esta acción.',
    });

    expect(mocks.reactivateTopic).not.toHaveBeenCalled();
    expect(mocks.createTopic).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test.each([
    ['   ', 'Ingresá un nombre para la temática'],
    ['a'.repeat(31), 'El nombre no puede superar los 30 caracteres'],
  ])('rejects the invalid name %#', async (name, message) => {
    await expect(createTopic(EMPTY_STATE, nameForm(name))).resolves.toEqual({
      errors: { name: [message] },
      values: { name },
    });

    expect(mocks.reactivateTopic).not.toHaveBeenCalled();
    expect(mocks.createTopic).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test('reports a duplicate name without revalidating', async () => {
    mocks.createTopic.mockRejectedValue(uniqueNameError());

    await expect(createTopic(EMPTY_STATE, nameForm('Education'))).resolves.toEqual({
      formError: 'Ya existe una temática con ese nombre.',
      values: { name: 'Education' },
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test('reports unexpected failures without revalidating', async () => {
    mocks.createTopic.mockRejectedValue(new Error('Connection lost'));

    await expect(createTopic(EMPTY_STATE, nameForm('Education'))).resolves.toEqual({
      formError: 'No se pudo crear la temática. Intentá de nuevo.',
      values: { name: 'Education' },
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe('editTopic', () => {
  test('renames a topic and refreshes affected routes', async () => {
    mocks.findTopic.mockResolvedValueOnce({ name: 'Health Studies' });
    const data = new FormData();
    data.set('name', 'Health');

    await expect(editTopic(4, EMPTY_STATE, data)).resolves.toEqual({ success: true });

    expect(mocks.updateTopic).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { name: 'Health' },
    });
    expect(mocks.createAuditLog).toHaveBeenCalledWith({
      data: {
        authorId: 1,
        action: 'update',
        entity: 'topic',
        entityId: 4,
        details: { previousName: 'Health Studies', name: 'Health' },
      },
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith('/management/topics');
  });

  test('rejects renaming a topic that does not exist or is inactive', async () => {
    const data = new FormData();
    data.set('name', 'Health');

    await expect(editTopic(4, EMPTY_STATE, data)).resolves.toEqual({
      formError: 'La temática no existe o ya fue eliminada.',
      values: { name: 'Health' },
    });

    expect(mocks.updateTopic).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });

  test('rejects a name used by another topic with different casing', async () => {
    mocks.findTopic.mockResolvedValueOnce({ name: 'Health' });
    mocks.findTopic.mockResolvedValueOnce({ id: 2, isActive: true });
    const data = new FormData();
    data.set('name', 'HEALTH');

    await expect(editTopic(4, EMPTY_STATE, data)).resolves.toEqual({
      formError: 'Ya existe una temática con ese nombre.',
      values: { name: 'HEALTH' },
    });

    expect(mocks.findTopic).toHaveBeenCalledWith({
      where: { id: { not: 4 }, name: { equals: 'HEALTH', mode: 'insensitive' } },
      select: { id: true, isActive: true },
    });
    expect(mocks.updateTopic).not.toHaveBeenCalled();
  });

  test('explains when the requested name belongs to an inactive topic', async () => {
    mocks.findTopic.mockResolvedValueOnce({ name: 'Health Studies' });
    mocks.findTopic.mockResolvedValueOnce({ id: 2, isActive: false });
    const data = new FormData();
    data.set('name', 'Health');

    await expect(editTopic(4, EMPTY_STATE, data)).resolves.toEqual({
      formError: 'Ese nombre pertenece a una temática dada de baja. Elegí otro nombre.',
      values: { name: 'Health' },
    });

    expect(mocks.updateTopic).not.toHaveBeenCalled();
  });

  test('rejects editing by a non-administrator', async () => {
    mocks.requireUser.mockResolvedValue({ id: 2, role: 'coordinator' });

    await expect(editTopic(4, EMPTY_STATE, nameForm('Health'))).resolves.toEqual({
      formError: 'No tenés permisos para realizar esta acción.',
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test.each([
    ['   ', 'Ingresá un nombre para la temática'],
    ['a'.repeat(31), 'El nombre no puede superar los 30 caracteres'],
  ])('rejects the invalid name %#', async (name, message) => {
    await expect(editTopic(4, EMPTY_STATE, nameForm(name))).resolves.toEqual({
      errors: { name: [message] },
      values: { name },
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.updateTopic).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test.each([0, -1, 1.5, NaN])('rejects the invalid id %s', async (id) => {
    await expect(editTopic(id, EMPTY_STATE, nameForm('Health'))).resolves.toEqual({
      formError: 'La temática no es válida.',
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test('reports a duplicate name without revalidating', async () => {
    mocks.transaction.mockRejectedValue(uniqueNameError());

    await expect(editTopic(4, EMPTY_STATE, nameForm('Health'))).resolves.toEqual({
      formError: 'Ya existe una temática con ese nombre.',
      values: { name: 'Health' },
    });

    expect(mocks.createAuditLog).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test('reports unexpected failures without revalidating', async () => {
    mocks.transaction.mockRejectedValue(new Error('Connection lost'));

    await expect(editTopic(4, EMPTY_STATE, nameForm('Health'))).resolves.toEqual({
      formError: 'No se pudo editar la temática. Intentá de nuevo.',
    });

    expect(mocks.createAuditLog).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe('deleteTopic', () => {
  beforeEach(() => {
    mocks.findTopic.mockResolvedValue({ name: 'Health' });
  });

  test('deactivates a topic only when it has no associated projects', async () => {
    await expect(deleteTopic(4)).resolves.toEqual({ success: true });

    expect(mocks.countProjects).toHaveBeenCalledWith({
      where: { topics: { some: { id: 4 } }, deletedAt: null },
    });
    expect(mocks.updateTopic).toHaveBeenCalledWith({
      where: { id: 4 },
      data: { isActive: false },
    });
    expect(mocks.createAuditLog).toHaveBeenCalledWith({
      data: {
        authorId: 1,
        action: 'deletion',
        entity: 'topic',
        entityId: 4,
        details: { name: 'Health' },
      },
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
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test('explains that an already inactive topic was deleted without recording it again', async () => {
    mocks.findTopic.mockResolvedValue(null);

    await expect(deleteTopic(4)).resolves.toEqual({
      formError: 'La temática no existe o ya fue eliminada.',
    });
    expect(mocks.findTopic).toHaveBeenCalledWith({
      where: { id: 4, isActive: true },
      select: { name: true },
    });
    expect(mocks.countProjects).not.toHaveBeenCalled();
    expect(mocks.updateTopic).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
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

  test.each([0, -1, 1.5, NaN])('rejects the invalid id %s', async (id) => {
    await expect(deleteTopic(id)).resolves.toEqual({
      formError: 'La temática no es válida.',
    });

    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.updateTopic).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test('reports unexpected failures without revalidating', async () => {
    mocks.transaction.mockRejectedValue(new Error('Connection lost'));

    await expect(deleteTopic(4)).resolves.toEqual({
      formError: 'No se pudo eliminar la temática. Intentá de nuevo.',
    });

    expect(mocks.updateTopic).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
