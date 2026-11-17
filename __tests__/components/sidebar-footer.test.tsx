import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const { isMobileMock, confirmLeaveMock, pushMock } = vi.hoisted(() => ({
  isMobileMock: vi.fn(),
  confirmLeaveMock: vi.fn(),
  pushMock: vi.fn(),
}));

vi.mock('@/app/actions/auth', () => ({ logout: vi.fn() }));
vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: isMobileMock }));
vi.mock('next/navigation', () => ({
  usePathname: () => '/management/metrics',
  useRouter: () => ({ push: pushMock }),
}));
vi.mock('@/components/ui/forms/pending-changes-provider', () => ({
  usePendingChangesContext: () => ({ confirmLeave: confirmLeaveMock }),
}));

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
  confirmLeaveMock.mockReset().mockResolvedValue(true);
  pushMock.mockReset();
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

test('navigates through the router when selecting the desktop profile link', async () => {
  renderFooter();

  fireEvent.click(screen.getByRole('button', { name: /Ana García/ }));
  fireEvent.click(await screen.findByRole('menuitem', { name: 'Mi perfil' }));

  expect(pushMock).toHaveBeenCalledExactlyOnceWith('/management/profile');
});

for (const mobile of [false, true]) {
  async function clickLogout() {
    if (mobile) {
      fireEvent.click(screen.getByRole('button', { name: 'Cerrar sesión' }));
    } else {
      fireEvent.click(screen.getByRole('button', { name: /Ana García/ }));
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Cerrar sesión' }));
    }
  }

  test(`keeps the session when confirmation is cancelled on ${mobile ? 'mobile' : 'desktop'}`, async () => {
    isMobileMock.mockReturnValue(mobile);
    confirmLeaveMock.mockResolvedValue(false);
    renderFooter();

    await clickLogout();

    expect(confirmLeaveMock).toHaveBeenCalledOnce();
    expect(logout).not.toHaveBeenCalled();
  });

  test(`waits for confirmation before logging out on ${mobile ? 'mobile' : 'desktop'}`, async () => {
    isMobileMock.mockReturnValue(mobile);
    let resolveConfirmation!: (accepted: boolean) => void;
    confirmLeaveMock.mockReturnValue(
      new Promise<boolean>((resolve) => {
        resolveConfirmation = resolve;
      })
    );
    renderFooter();

    await clickLogout();

    expect(confirmLeaveMock).toHaveBeenCalledOnce();
    expect(logout).not.toHaveBeenCalled();

    await act(async () => resolveConfirmation(true));

    await waitFor(() => expect(logout).toHaveBeenCalledOnce());
  });
}
