import { render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { BeneficiaryCategoriesManagement } from '@/components/beneficiary-categories/beneficiary-categories-management';

vi.mock('@/app/actions/beneficiary-categories', () => ({
  createBeneficiaryCategory: vi.fn(),
  deleteBeneficiaryCategory: vi.fn(),
}));

const CATEGORIES = [
  { id: 3, name: 'Familias', isSystem: true, projectCount: 4 },
  { id: 9, name: 'Docentes', isSystem: false, projectCount: 0 },
];

it('links beneficiary categories with projects to the filtered projects page', () => {
  render(<BeneficiaryCategoriesManagement categories={CATEGORIES} />);

  const families = screen.getByText('Familias').closest('li');
  expect(families).not.toBeNull();
  expect(within(families!).getByRole('link', { name: '4 proyectos' }).getAttribute('href')).toBe(
    '/dashboard/projects?beneficiaryCategoryId=3&status=all&beneficiaryYear=all'
  );
});

it('keeps the project count as plain text when a beneficiary category has no projects', () => {
  render(<BeneficiaryCategoriesManagement categories={CATEGORIES} />);

  const teachers = screen.getByText('Docentes').closest('li');
  expect(teachers).not.toBeNull();
  expect(within(teachers!).queryByRole('link')).toBeNull();
  expect(within(teachers!).getByText('0 proyectos').tagName).toBe('SPAN');
});
