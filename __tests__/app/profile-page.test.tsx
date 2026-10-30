import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { makeUser } from '../fixtures/user';

const { authMock, findFirstMock, profileFormMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  findFirstMock: vi.fn(),
  profileFormMock: vi.fn((props: { profile: Record<string, unknown> }) => {
    void props;
    return null;
  }),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('@/lib/prisma', () => ({ default: { user: { findFirst: findFirstMock } } }));
vi.mock('@/components/profile-form', () => ({ ProfileForm: profileFormMock }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));

import ProfilePage from '@/app/(protected)/management/profile/page';

beforeEach(() => {
  authMock.mockReset();
  findFirstMock.mockReset();
  profileFormMock.mockClear();
  redirectMock.mockClear();
  redirectMock.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
});

describe('ProfilePage', () => {
  test('redirects unauthenticated visitors before reading profile data', async () => {
    authMock.mockResolvedValue(null);

    await expect(ProfilePage()).rejects.toThrow('NEXT_REDIRECT:/login');
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  test('loads the active profile using the authenticated user id', async () => {
    authMock.mockResolvedValue({ user: { id: '7', role: 'coordinator' } });
    const user = makeUser({
      id: 7,
      firstName: 'Ana',
      lastName: 'García',
      documentId: '41234567',
      email: 'ana@example.com',
      role: 'coordinator',
    });
    const profile = {
      firstName: user.firstName,
      lastName: user.lastName,
      documentId: user.documentId,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
      lastAccess: user.lastAccess,
      updatedAt: user.updatedAt,
    };
    findFirstMock.mockResolvedValue(profile);

    render(await ProfilePage());

    expect(findFirstMock).toHaveBeenCalledWith({
      where: {
        id: 7,
        status: 'active',
        deletedAt: null,
      },
      select: {
        firstName: true,
        lastName: true,
        documentId: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        lastAccess: true,
        updatedAt: true,
      },
    });
    expect(screen.getByRole('heading', { name: 'Mi perfil' })).toBeDefined();
    expect(profileFormMock).toHaveBeenCalledOnce();
    expect(profileFormMock.mock.calls[0]?.[0]).toEqual({ profile });
  });

  test('redirects when the authenticated account is no longer active', async () => {
    authMock.mockResolvedValue({ user: { id: '7', role: 'coordinator' } });
    findFirstMock.mockResolvedValue(null);

    await expect(ProfilePage()).rejects.toThrow('NEXT_REDIRECT:/login');
  });
});
