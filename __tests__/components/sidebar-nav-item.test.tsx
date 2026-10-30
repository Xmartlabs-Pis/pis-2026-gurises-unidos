import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const { isMobileMock } = vi.hoisted(() => ({ isMobileMock: vi.fn() }));

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: isMobileMock }));

import { SidebarCollapsibleNavItem } from '@/components/layout/app-sidebar/nav-item';
import { NAV_GROUPS } from '@/components/layout/app-sidebar/navigation';
import { SidebarMenu, SidebarProvider } from '@/components/ui/sidebar';

const DASHBOARD_ITEM = NAV_GROUPS[0].items.find((item) => item.id === 'dashboard')!;

function renderNavItem(defaultOpen: boolean) {
  render(
    <SidebarProvider defaultOpen={defaultOpen}>
      <SidebarMenu>
        <SidebarCollapsibleNavItem item={DASHBOARD_ITEM} pathname="/management/users" />
      </SidebarMenu>
    </SidebarProvider>
  );
}

beforeEach(() => {
  isMobileMock.mockReturnValue(false);
});

test('expands the collapsed sidebar and the submenu instead of navigating', () => {
  renderNavItem(false);
  expect(screen.queryByRole('link', { name: 'Proyectos' })).toBeNull();

  const notPrevented = fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }));

  expect(notPrevented).toBe(false);
  expect(screen.getByRole('link', { name: 'Proyectos' }).getAttribute('href')).toBe(
    '/dashboard/projects'
  );
});

test('navigates to the dashboard when the sidebar is expanded', () => {
  renderNavItem(true);

  const notPrevented = fireEvent.click(screen.getByRole('link', { name: 'Dashboard' }));

  expect(notPrevented).toBe(true);
});
