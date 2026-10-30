import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const { isMobileMock } = vi.hoisted(() => ({ isMobileMock: vi.fn() }));

vi.mock('@/app/actions/auth', () => ({ logout: vi.fn() }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: isMobileMock }));

import { logout } from '@/app/actions/auth';
import { AppSidebarFooter } from '@/components/layout/app-sidebar/footer';
import { SidebarProvider } from '@/components/ui/sidebar';

const USER = {
  id: '1',
  role: 'admin' as const,
  name: 'Ana García',
  email: 'ana@example.com',
  avatarColorIndex: 0,
  mustChangePassword: false,
};

function renderFooter() {
  render(
    <SidebarProvider>
      <AppSidebarFooter user={USER} />
    </SidebarProvider>
  );
}

beforeEach(() => {
  vi.mocked(logout).mockClear();
  isMobileMock.mockReturnValue(false);
});

test('links to the profile from the user menu on desktop', async () => {
  renderFooter();

  fireEvent.click(screen.getByRole('button', { name: /Ana García/ }));

  const profileLink = await screen.findByRole('menuitem', { name: 'Mi perfil' });
  expect(profileLink.getAttribute('href')).toBe('/management/profile');
});

test('links to the profile directly on mobile', () => {
  isMobileMock.mockReturnValue(true);

  renderFooter();

  expect(screen.getByRole('link', { name: 'Mi perfil' }).getAttribute('href')).toBe(
    '/management/profile'
  );
});

test('logs out from the user menu on desktop', async () => {
  renderFooter();

  fireEvent.click(screen.getByRole('button', { name: /Ana García/ }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }));

  await waitFor(() => expect(logout).toHaveBeenCalledOnce());
});

test('logs out directly on mobile', async () => {
  isMobileMock.mockReturnValue(true);

  renderFooter();

  fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));

  await waitFor(() => expect(logout).toHaveBeenCalledOnce());
});
