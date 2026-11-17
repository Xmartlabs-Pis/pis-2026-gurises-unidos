import { beforeEach, describe, expect, test, vi } from 'vitest';

const { authMock, forbiddenMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  forbiddenMock: vi.fn(() => {
    throw new Error('NEXT_FORBIDDEN');
  }),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('next/navigation', () => ({ forbidden: forbiddenMock, redirect: redirectMock }));

import { requireAdmin } from '@/lib/auth/require-admin';

beforeEach(() => {
  authMock.mockReset();
  forbiddenMock.mockClear();
  redirectMock.mockClear();
});

describe('requireAdmin', () => {
  test('returns the session user for admins', async () => {
    authMock.mockResolvedValue({ user: { id: '1', role: 'admin' } });

    await expect(requireAdmin()).resolves.toEqual({ id: '1', role: 'admin' });
    expect(forbiddenMock).not.toHaveBeenCalled();
  });

  test('renders the forbidden page for coordinators', async () => {
    authMock.mockResolvedValue({ user: { id: '2', role: 'coordinator' } });

    await expect(requireAdmin()).rejects.toThrow('NEXT_FORBIDDEN');
  });

  test('redirects to login when there is no session', async () => {
    authMock.mockResolvedValue(null);

    await expect(requireAdmin()).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(forbiddenMock).not.toHaveBeenCalled();
  });
});
