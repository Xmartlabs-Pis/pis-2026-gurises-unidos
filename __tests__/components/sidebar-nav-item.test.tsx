import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const { isMobileMock } = vi.hoisted(() => ({ isMobileMock: vi.fn() }));

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: isMobileMock }));

import { SidebarNavItem } from '@/components/layout/app-sidebar/nav-item';
import { NAV_GROUPS } from '@/components/layout/app-sidebar/navigation';
import { SidebarMenu, SidebarProvider, useSidebar } from '@/components/ui/sidebar';

const MAIN_ITEMS = NAV_GROUPS[0].items;

beforeEach(() => {
  isMobileMock.mockReturnValue(false);
});

test('shows dashboard and projects as top-level links', () => {
  render(
    <SidebarProvider>
      <SidebarMenu>
        {MAIN_ITEMS.map((item) => (
          <SidebarNavItem key={item.id} item={item} pathname="/dashboard" />
        ))}
      </SidebarMenu>
    </SidebarProvider>
  );

  expect(screen.getByRole('link', { name: 'Dashboard' }).getAttribute('href')).toBe('/dashboard');
  expect(screen.getByRole('link', { name: 'Proyectos' }).getAttribute('href')).toBe(
    '/dashboard/projects'
  );
});

function MobileMenuState() {
  const { openMobile, setOpenMobile } = useSidebar();

  return (
    <>
      <button onClick={() => setOpenMobile(true)}>Open menu</button>
      <output aria-label="Menu state">{openMobile ? 'open' : 'closed'}</output>
    </>
  );
}

test.each([
  ['/dashboard', MAIN_ITEMS[0], 'closed'],
  ['/dashboard/projects', MAIN_ITEMS[1], 'closed'],
  ['/dashboard/projects/10/edit', MAIN_ITEMS[1], 'open'],
  ['/management/profile', MAIN_ITEMS[1], 'open'],
] as const)('only closes the current page link when at %s', (pathname, item, expected) => {
  isMobileMock.mockReturnValue(true);
  render(
    <SidebarProvider>
      <MobileMenuState />
      <SidebarMenu>
        <SidebarNavItem item={item} pathname={pathname} />
      </SidebarMenu>
    </SidebarProvider>
  );

  fireEvent.click(screen.getByRole('button', { name: 'Open menu' }));
  fireEvent.click(screen.getByRole('link', { name: item.title }));
  expect(screen.getByRole('status', { name: 'Menu state' }).textContent).toBe(expected);
});
