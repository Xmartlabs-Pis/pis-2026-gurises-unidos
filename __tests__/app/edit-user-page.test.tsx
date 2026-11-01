import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const { authMock, findUniqueMock, forbiddenMock, notFoundMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findUniqueMock: vi.fn(),
  forbiddenMock: vi.fn(() => {
    throw new Error('NEXT_FORBIDDEN');
  }),
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('@/lib/prisma', () => ({
  default: { user: { findUnique: findUniqueMock } },
}));
vi.mock('next/navigation', () => ({
  forbidden: forbiddenMock,
  notFound: notFoundMock,
  redirect: redirectMock,
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/app/actions/users', () => ({
  createUser: vi.fn(async () => ({})),
  updateUser: vi.fn(async () => ({})),
}));
vi.mock('@/app/actions/password', () => ({
  resetPassword: vi.fn(async () => ({})),
}));

import EditUserPage from '@/app/(protected)/management/users/[id]/edit/page';

beforeEach(() => {
  authMock.mockReset();
  findUniqueMock.mockReset();
  notFoundMock.mockReset();
  redirectMock.mockReset();
  authMock.mockResolvedValue({ user: { id: '1', role: 'admin' } });
  notFoundMock.mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  });
  redirectMock.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
});

test('loads the selected user and prefills the edit form', async () => {
  findUniqueMock.mockResolvedValue({
    id: 42,
    firstName: 'Ana',
    lastName: 'García',
    documentId: '77777777',
    email: 'ana@example.com',
    role: 'coordinator',
    status: 'active',
    lastAccess: new Date('2026-09-17T12:00:00.000Z'),
    createdAt: new Date('2026-01-02T12:00:00.000Z'),
    updatedAt: new Date('2026-09-18T12:00:00.000Z'),
    deletedAt: null,
    creator: { firstName: 'Mario', lastName: 'Pérez' },
  });

  render(await EditUserPage({ params: Promise.resolve({ id: '42' }) }));

  expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Ana');
  expect((screen.getByLabelText('Apellido') as HTMLInputElement).value).toBe('García');
  expect((screen.getByLabelText('Documento (Cédula)') as HTMLInputElement).value).toBe('77777777');
  expect((screen.getByLabelText('Correo electrónico') as HTMLInputElement).value).toBe(
    'ana@example.com'
  );
  expect(screen.getByText('Mario Pérez')).toBeDefined();
});

test('returns not found for an invalid user id without querying the database', async () => {
  await expect(EditUserPage({ params: Promise.resolve({ id: 'invalid' }) })).rejects.toThrow(
    'NEXT_NOT_FOUND'
  );

  expect(findUniqueMock).not.toHaveBeenCalled();
});

test('shows the forbidden page to coordinators without querying the database', async () => {
  authMock.mockResolvedValue({ user: { id: '2', role: 'coordinator' } });

  await expect(EditUserPage({ params: Promise.resolve({ id: '42' }) })).rejects.toThrow(
    'NEXT_FORBIDDEN'
  );

  expect(findUniqueMock).not.toHaveBeenCalled();
});

test('returns not found for a deleted user', async () => {
  findUniqueMock.mockResolvedValue(null);

  await expect(EditUserPage({ params: Promise.resolve({ id: '42' }) })).rejects.toThrow(
    'NEXT_NOT_FOUND'
  );
});
