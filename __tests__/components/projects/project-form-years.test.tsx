import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import type { SelectField } from '@/components/ui/forms/select-field';
import { ProjectForm } from '@/components/projects/form/project-form';
import { BENEFICIARY_CATEGORY_OPTIONS } from '../../mocks/beneficiary-values';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components/ui/forms/select-field', () => ({
  SelectField: ({
    id,
    name,
    label,
    options,
    onValueChange,
  }: ComponentProps<typeof SelectField>) => (
    <label htmlFor={id}>
      {label}
      <select
        id={id}
        name={name}
        defaultValue=""
        onChange={(event) => onValueChange?.(event.currentTarget.value)}
      >
        <option value="">Seleccionar</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  ),
}));

it('loads only the selected year and retains unsaved drafts when switching years', async () => {
  const counts = {
    directChildrenAdolescents: 0,
    indirectChildrenAdolescents: 0,
    youth18To29: 0,
    families: 30,
    coordinatedInstitutions: 0,
    communityLeaders: 0,
    basicServiceStaff: 0,
  };
  render(
    <ProjectForm
      beneficiaryCategories={BENEFICIARY_CATEGORY_OPTIONS}
      strategicLines={[]}
      currentYear={2026}
      topics={[]}
      coordinators={[]}
      departments={[]}
      beneficiaryRecords={[{ ...counts, year: 2025 }]}
      submitAction={vi.fn()}
      initialValues={{ startYear: '2020' }}
    />
  );
  expect((screen.getByLabelText('Familias') as HTMLInputElement).value).toBe('0');
  fireEvent.change(screen.getByLabelText('Año de beneficiarios'), { target: { value: '2025' } });
  expect((screen.getByLabelText('Familias') as HTMLInputElement).value).toBe('30');
  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '45' } });
  fireEvent.change(screen.getByLabelText('Año de beneficiarios'), { target: { value: '2026' } });
  expect((screen.getByLabelText('Familias') as HTMLInputElement).value).toBe('0');
  fireEvent.change(screen.getByLabelText('Año de beneficiarios'), { target: { value: '2025' } });
  expect((screen.getByLabelText('Familias') as HTMLInputElement).value).toBe('45');
});
