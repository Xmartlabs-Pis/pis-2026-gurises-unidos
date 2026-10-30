import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { ProjectYearSelector } from '@/components/projects/detail/project-year-selector';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/projects/42',
  useRouter: () => ({ push: pushMock }),
}));

beforeEach(() => {
  pushMock.mockReset();
});

test('stores the selected project year in the URL', async () => {
  render(<ProjectYearSelector year={2026} years={[2026, 2025, 2024]} />);

  fireEvent.click(screen.getByRole('combobox', { name: 'Seleccionar año' }));
  fireEvent.keyDown(await screen.findByRole('option', { name: '2025' }), { key: 'Enter' });

  expect(pushMock).toHaveBeenCalledWith('/dashboard/projects/42?year=2025', { scroll: false });
});

test('shows the current project year in the dropdown', () => {
  render(<ProjectYearSelector year={2025} years={[2026, 2025, 2024]} />);

  expect(screen.getByRole('combobox', { name: 'Seleccionar año' }).textContent).toContain('2025');
  expect(screen.queryByRole('tablist')).toBeNull();
});
