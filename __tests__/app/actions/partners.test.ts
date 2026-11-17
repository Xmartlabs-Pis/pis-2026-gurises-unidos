import { beforeEach, describe, expect, test, vi } from 'vitest';
import { Prisma } from '@/generated/prisma/client';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  transaction: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock('@/lib/auth/require-user', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/lib/prisma', () => ({ default: { $transaction: mocks.transaction } }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));

import { createPartner, deletePartner, editPartner } from '@/app/actions/partners';

const EMPTY_STATE = {};

function partnerForm(name: string, counterpartyType = 'publicSector') {
  const data = new FormData();
  data.set('name', name);
  data.set('counterpartyType', counterpartyType);
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
});

describe('createPartner', () => {
  test('reports a duplicate name without revalidating', async () => {
    mocks.transaction.mockRejectedValue(uniqueNameError());

    await expect(createPartner(EMPTY_STATE, partnerForm('INAU'))).resolves.toEqual({
      formError: 'Ya existe un socio con ese nombre.',
      values: { name: 'INAU', counterpartyType: 'publicSector' },
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test('reports unexpected failures without revalidating', async () => {
    mocks.transaction.mockRejectedValue(new Error('Connection lost'));

    await expect(createPartner(EMPTY_STATE, partnerForm('INAU', 'privateSector'))).resolves.toEqual(
      {
        formError: 'No se pudo crear el socio. Intentá de nuevo.',
        values: { name: 'INAU', counterpartyType: 'privateSector' },
      }
    );

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe('editPartner', () => {
  test('reports a duplicate name without revalidating', async () => {
    mocks.transaction.mockRejectedValue(uniqueNameError());

    await expect(
      editPartner(5, EMPTY_STATE, partnerForm('INAU', 'privateSector'))
    ).resolves.toEqual({
      formError: 'Ya existe un socio con ese nombre.',
      values: { name: 'INAU', counterpartyType: 'privateSector' },
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test('reports unexpected failures without revalidating', async () => {
    mocks.transaction.mockRejectedValue(new Error('Connection lost'));

    await expect(editPartner(5, EMPTY_STATE, partnerForm('INAU'))).resolves.toEqual({
      formError: 'No se pudo editar el socio. Intentá de nuevo.',
      values: { name: 'INAU', counterpartyType: 'publicSector' },
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});

describe('deletePartner', () => {
  test('reports a duplicate constraint failure without revalidating', async () => {
    mocks.transaction.mockRejectedValue(uniqueNameError());

    await expect(deletePartner(5)).resolves.toEqual({
      formError: 'No se pudo eliminar el socio. Intentá de nuevo.',
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  test('reports unexpected failures without revalidating', async () => {
    mocks.transaction.mockRejectedValue(new Error('Connection lost'));

    await expect(deletePartner(5)).resolves.toEqual({
      formError: 'No se pudo eliminar el socio. Intentá de nuevo.',
    });

    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });
});
