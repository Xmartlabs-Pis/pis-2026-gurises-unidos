import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import type { Session } from 'next-auth';
import PublicLayout from '@/app/(public)/layout';

const mocks = vi.hoisted(() => ({
  auth: vi.fn<() => Promise<Session | null>>(),
  logout: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/app/actions/auth', () => ({ logout: mocks.logout }));
vi.mock('@/components/header', () => ({ Header: () => <header>Public header</header> }));

const SESSION: Session = {
  expires: '2027-01-01T00:00:00.000Z',
  user: {
    id: '1',
    name: 'Test User',
    email: 'user@example.com',
    role: 'admin',
    avatarColorIndex: 0,
    remember: false,
    mustChangePassword: false,
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue(null);
  mocks.logout.mockResolvedValue(undefined);
});

test('keeps the public view accessible without showing session controls to anonymous visitors', async () => {
  render(await PublicLayout({ children: <h1>Public report</h1> }));

  expect(screen.getByRole('heading', { name: 'Public report' })).toBeDefined();
  expect(screen.queryByRole('navigation', { name: 'Navegación de sesión' })).toBeNull();
  expect(screen.queryByRole('link', { name: 'Volver al dashboard' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Cerrar sesión' })).toBeNull();
});

test.each(['admin', 'coordinator'] as const)(
  'shows session navigation for an authenticated %s',
  async (role) => {
    mocks.auth.mockResolvedValue({ ...SESSION, user: { ...SESSION.user, role } });
    render(await PublicLayout({ children: <h1>Public report</h1> }));

    const toolbar = screen.getByRole('navigation', { name: 'Navegación de sesión' });
    const header = screen.getByText('Public header');
    expect(screen.getByText('user@example.com')).toBeDefined();
    expect(screen.getByRole('link', { name: 'Volver al dashboard' }).getAttribute('href')).toBe(
      '/dashboard'
    );
    expect(toolbar.compareDocumentPosition(header) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  }
);

test('closes the session using the existing logout action', async () => {
  mocks.auth.mockResolvedValue(SESSION);
  render(await PublicLayout({ children: <h1>Public report</h1> }));

  fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

  await waitFor(() => expect(mocks.logout).toHaveBeenCalledOnce());
});
