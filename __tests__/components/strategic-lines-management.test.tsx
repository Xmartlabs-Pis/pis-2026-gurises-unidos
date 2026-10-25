import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { StrategicLinesManagement } from '@/components/strategic-lines/strategic-lines-management';

vi.mock('@/app/actions/strategic-lines', () => ({
  createStrategicLine: vi.fn(),
  deleteStrategicLine: vi.fn(),
}));

const LINES = [
  { id: 5, name: 'Formación', _count: { projects: 3 } },
  { id: 8, name: 'Atención Directa', _count: { projects: 0 } },
];

it('links strategic lines with projects to the filtered projects page', () => {
  render(<StrategicLinesManagement lines={LINES} />);

  const training = screen.getByText('Formación').closest('li');
  expect(training).not.toBeNull();
  expect(within(training!).getByRole('link', { name: '3 proyectos' }).getAttribute('href')).toBe(
    '/dashboard/projects?strategicLineId=5&status=all&beneficiaryYear=all'
  );
});

it('keeps the project count as plain text when a strategic line has no projects', () => {
  render(<StrategicLinesManagement lines={LINES} />);

  const directCare = screen.getByText('Atención Directa').closest('li');
  expect(directCare).not.toBeNull();
  expect(within(directCare!).queryByRole('link')).toBeNull();
  expect(within(directCare!).getByText('0 proyectos').tagName).toBe('SPAN');
});
