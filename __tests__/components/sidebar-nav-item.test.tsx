import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const { isMobileMock } = vi.hoisted(() => ({ isMobileMock: vi.fn() }));

vi.mock('@/hooks/use-mobile', () => ({ useIsMobile: isMobileMock }));

import { SidebarNavItem } from '@/components/layout/app-sidebar/nav-item';
import { NAV_GROUPS } from '@/components/layout/app-sidebar/navigation';
import { SidebarMenu, SidebarProvider } from '@/components/ui/sidebar';

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
