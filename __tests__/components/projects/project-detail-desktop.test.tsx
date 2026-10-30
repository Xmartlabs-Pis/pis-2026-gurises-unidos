import { render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const { pushMock } = vi.hoisted(() => ({
  pushMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/projects/42',
  useRouter: () => ({ push: pushMock }),
}));
vi.mock('@/components/ui/sidebar', () => ({
  SidebarTrigger: () => <button type="button">Abrir menú</button>,
}));

import { ProjectTopbarRegistration, TopbarProvider } from '@/components/layout/topbar-context';
import { ProjectRecentActivity } from '@/components/projects/detail/project-recent-activity';
import { Topbar } from '@/components/topbar';

beforeEach(() => {
  pushMock.mockReset();
});

test('shows the project year and breadcrumb in the desktop topbar', async () => {
  render(
    <TopbarProvider>
      <Topbar />
      <ProjectTopbarRegistration
        projectName="El Resorte"
        selectedYear={2026}
        years={[2026, 2025, 2024]}
      />
    </TopbarProvider>
  );

  await waitFor(() => expect(screen.getByText('El Resorte')).toBeDefined());
  expect(screen.getByRole('combobox', { name: 'Seleccionar año' }).textContent).toContain('2026');
  expect(screen.queryByText('Todo el país')).toBeNull();
  expect(screen.queryByRole('button', { name: 'Exportar' })).toBeNull();
});

test('uses the full recent activity table on desktop', () => {
  render(<ProjectRecentActivity />);

  const table = screen.getByRole('table', { hidden: true });
  expect(table.parentElement?.className).toContain('md:block');
  expect(within(table).getAllByRole('row', { hidden: true })).toHaveLength(6);
  expect(within(table).getByText('Articulación con escuela pública')).toBeDefined();
  expect(within(table).getAllByText('Carlos Méndez')).toHaveLength(2);
});
