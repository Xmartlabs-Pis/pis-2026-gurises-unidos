import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { useFormContext } from 'react-hook-form';
import type { SelectField } from '@/components/ui/forms/select-field';
import { ProjectForm } from '@/components/projects/form/project-form';
import { BENEFICIARY_CATEGORY_OPTIONS } from '../../mocks/beneficiary-values';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/components/ui/forms/select-field', () => ({
  SelectField: function MockSelectField({
    id,
    name,
    label,
    options,
    onValueChange,
    description,
    messages,
  }: ComponentProps<typeof SelectField>) {
    const { setValue } = useFormContext();
    return (
      <>
        <label htmlFor={id}>
          {label}
          <select
            id={id}
            name={name}
            defaultValue=""
            onChange={(event) => {
              onValueChange?.(event.currentTarget.value);
              setValue(name, event.currentTarget.value);
            }}
          >
            <option value="">Seleccionar</option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <span>{messages?.[0] ?? description}</span>
      </>
    );
  },
}));

const NO_DIRECT_CHILDREN_HINT = 'Disponible al cargar al menos un NNA directo.';

function selectYear(year: string) {
  fireEvent.change(screen.getByLabelText('Año de beneficiarios'), { target: { value: year } });
}

function submittedDrafts() {
  return [...document.querySelectorAll<HTMLInputElement>('input[name="beneficiaryDrafts"]')].map(
    (input) => JSON.parse(input.value)
  );
}

function renderForm(props: Partial<ComponentProps<typeof ProjectForm>> = {}) {
  return render(
    <ProjectForm
      beneficiaryCategories={BENEFICIARY_CATEGORY_OPTIONS}
      strategicLines={[]}
      currentYear={2026}
      topics={[]}
      coordinators={[]}
      departments={[]}
      submitAction={vi.fn()}
      initialValues={{ startYear: '2020' }}
      {...props}
    />
  );
}

const SAVED_COUNTS = {
  directChildrenAdolescents: 0,
  indirectChildrenAdolescents: 0,
  youth18To29: 0,
  families: 30,
  coordinatedInstitutions: 0,
  communityLeaders: 0,
  basicServiceStaff: 0,
};

it('loads only the selected year and retains unsaved drafts when switching years', () => {
  renderForm({ beneficiaryRecords: [{ ...SAVED_COUNTS, year: 2025 }] });
  expect((screen.getByLabelText('Familias') as HTMLInputElement).value).toBe('0');
  selectYear('2025');
  expect((screen.getByLabelText('Familias') as HTMLInputElement).value).toBe('30');
  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '45' } });
  selectYear('2026');
  expect((screen.getByLabelText('Familias') as HTMLInputElement).value).toBe('0');
  selectYear('2025');
  expect((screen.getByLabelText('Familias') as HTMLInputElement).value).toBe('45');
});

it('submits only the years that differ from what is saved', () => {
  renderForm({ beneficiaryRecords: [{ ...SAVED_COUNTS, year: 2025 }] });

  selectYear('2024');
  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '12' } });
  selectYear('2025');
  selectYear('2023');

  expect(submittedDrafts()).toEqual([expect.objectContaining({ year: '2024', families: '12' })]);
});

it('stops submitting a year when it is selected again or reverted', () => {
  renderForm({ beneficiaryRecords: [{ ...SAVED_COUNTS, year: 2025 }] });

  selectYear('2025');
  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '45' } });
  selectYear('2026');
  expect(submittedDrafts()).toHaveLength(1);

  selectYear('2025');
  expect(submittedDrafts()).toEqual([]);

  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '30' } });
  selectYear('2026');
  expect(submittedDrafts()).toEqual([]);
});

it('discards drafts outside the project period', async () => {
  renderForm();

  selectYear('2021');
  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '12' } });
  selectYear('2026');
  expect(submittedDrafts()).toHaveLength(1);

  fireEvent.change(screen.getByLabelText('Año de inicio'), { target: { value: '2022' } });

  await waitFor(() => expect(submittedDrafts()).toEqual([]));
});

it('enables intensity based on drafts', () => {
  renderForm({
    beneficiaryRecords: [{ ...SAVED_COUNTS, directChildrenAdolescents: 8, year: 2025 }],
  });
  expect(screen.queryByText(NO_DIRECT_CHILDREN_HINT)).toBeNull();

  selectYear('2025');
  fireEvent.change(screen.getByLabelText('NNA directos'), { target: { value: '0' } });
  selectYear('2026');
  expect(screen.getByText(NO_DIRECT_CHILDREN_HINT)).toBeTruthy();

  selectYear('2024');
  fireEvent.change(screen.getByLabelText('NNA directos'), { target: { value: '3' } });
  selectYear('2026');
  expect(screen.queryByText(NO_DIRECT_CHILDREN_HINT)).toBeNull();
});

it('blocks the submit while a draft is invalid', async () => {
  const submitAction = vi.fn();
  renderForm({ submitAction });

  selectYear('2024');
  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '-1' } });
  selectYear('2026');
  fireEvent.submit(screen.getByLabelText('Familias').closest('form') as HTMLFormElement);

  expect(await screen.findByText('Revisá los beneficiarios de 2024')).toBeTruthy();
  expect(submitAction).not.toHaveBeenCalled();

  selectYear('2024');
  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '4' } });
  selectYear('2026');

  await waitFor(() => expect(screen.queryByText('Revisá los beneficiarios de 2024')).toBeNull());
});
