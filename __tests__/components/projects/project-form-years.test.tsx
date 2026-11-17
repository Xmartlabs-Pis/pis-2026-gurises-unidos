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
      partners={[]}
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

const CUSTOM_CATEGORY = { key: 'customTest', name: 'Custom beneficiaries' } as const;

it.each([...BENEFICIARY_CATEGORY_OPTIONS, CUSTOM_CATEGORY])(
  'limits the end year using $key and unlocks it after clearing counts',
  (category) => {
    const emptyCounts = Object.fromEntries(BENEFICIARY_CATEGORY_OPTIONS.map(({ key }) => [key, 0]));
    renderForm({
      mode: 'edit',
      initialValues: { startYear: '2020', status: 'inactive', endYear: '2026' },
      beneficiaryCategories: [...BENEFICIARY_CATEGORY_OPTIONS, CUSTOM_CATEGORY],
      beneficiaryRecords: [{ ...SAVED_COUNTS, ...emptyCounts, year: 2025, [category.key]: 1 }],
    });
    const endSelect = screen.getByLabelText('Año de fin') as HTMLSelectElement;
    expect([...endSelect.options].some((option) => option.value === '2024')).toBe(false);
    expect([...endSelect.options].some((option) => option.value === '2025')).toBe(true);
    selectYear('2025');
    fireEvent.change(screen.getByLabelText(category.name), { target: { value: '0' } });
    expect([...endSelect.options].some((option) => option.value === '2024')).toBe(true);
    fireEvent.change(endSelect, { target: { value: '2024' } });
    const yearSelect = screen.getByLabelText('Año de beneficiarios') as HTMLSelectElement;
    expect([...yearSelect.options].some((option) => option.value === '2025')).toBe(false);
    expect(submittedDrafts()).toEqual([
      expect.objectContaining({ year: '2025', [category.key]: '0' }),
    ]);
  }
);

it.each([...BENEFICIARY_CATEGORY_OPTIONS, CUSTOM_CATEGORY])(
  'uses positive counts in $key to limit the start year',
  (category) => {
    const emptyCounts = Object.fromEntries(BENEFICIARY_CATEGORY_OPTIONS.map(({ key }) => [key, 0]));
    renderForm({
      mode: 'edit',
      beneficiaryCategories: [...BENEFICIARY_CATEGORY_OPTIONS, CUSTOM_CATEGORY],
      beneficiaryRecords: [{ ...SAVED_COUNTS, ...emptyCounts, year: 2020, [category.key]: 1 }],
    });

    const startSelect = screen.getByLabelText('Año de inicio') as HTMLSelectElement;
    expect([...startSelect.options].some((option) => option.value === '2021')).toBe(false);
    expect([...startSelect.options].some((option) => option.value === '2020')).toBe(true);
    expect([...startSelect.options].some((option) => option.value === '2019')).toBe(true);
    expect(
      screen.getByText(
        'El año de inicio no puede ser posterior a 2020, porque tiene beneficiarios registrados'
      )
    ).toBeTruthy();

    selectYear('2020');
    fireEvent.change(screen.getByLabelText(category.name), { target: { value: '0' } });
    expect([...startSelect.options].some((option) => option.value === '2021')).toBe(true);

    fireEvent.change(screen.getByLabelText(category.name), { target: { value: '2' } });
    selectYear('2026');
    expect([...startSelect.options].some((option) => option.value === '2021')).toBe(false);
    selectYear('2020');
    expect((screen.getByLabelText(category.name) as HTMLInputElement).value).toBe('2');
  }
);

it('does not restrict the start for a saved year with only zero counts', () => {
  renderForm({
    mode: 'edit',
    beneficiaryRecords: [{ ...SAVED_COUNTS, families: 0, year: 2020 }],
  });

  const startSelect = screen.getByLabelText('Año de inicio') as HTMLSelectElement;
  expect([...startSelect.options].some((option) => option.value === '2022')).toBe(true);
});

it.each([
  { startYear: '2022', year: 2020, status: 'active', endYear: '' },
  { startYear: '2020', year: 2025, status: 'inactive', endYear: '2022' },
])('hides empty saved years outside $startYear–$endYear after reopening', (period) => {
  renderForm({
    mode: 'edit',
    initialValues: { ...period, year: String(period.year) },
    beneficiaryRecords: [{ ...SAVED_COUNTS, families: 0, year: period.year }],
  });

  const yearSelect = screen.getByLabelText('Año de beneficiarios') as HTMLSelectElement;
  expect([...yearSelect.options].some((option) => option.value === String(period.year))).toBe(
    false
  );
  expect((screen.getByLabelText('Familias') as HTMLInputElement).value).toBe('0');
  expect(submittedDrafts()).toEqual([]);
});

it('keeps empty saved years selectable within the project period', () => {
  renderForm({
    mode: 'edit',
    beneficiaryRecords: [{ ...SAVED_COUNTS, families: 0, year: 2020 }],
  });

  const yearSelect = screen.getByLabelText('Año de beneficiarios') as HTMLSelectElement;
  expect([...yearSelect.options].some((option) => option.value === '2020')).toBe(true);
  selectYear('2020');
  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '5' } });
  expect((screen.getByLabelText('Familias') as HTMLInputElement).value).toBe('5');
});

it('keeps the earliest remaining populated year as the limit after partially clearing data', () => {
  renderForm({
    mode: 'edit',
    beneficiaryRecords: [
      { ...SAVED_COUNTS, youth18To29: 5, year: 2020 },
      { ...SAVED_COUNTS, year: 2022 },
    ],
  });
  const startSelect = screen.getByLabelText('Año de inicio') as HTMLSelectElement;

  selectYear('2020');
  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '0' } });
  expect([...startSelect.options].some((option) => option.value === '2021')).toBe(false);

  fireEvent.change(screen.getByLabelText('Jóvenes (18 a 29)'), { target: { value: '0' } });
  expect([...startSelect.options].some((option) => option.value === '2022')).toBe(true);
  expect([...startSelect.options].some((option) => option.value === '2023')).toBe(false);
});

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

it('limits the start year to years compatible with the current beneficiary counts', () => {
  renderForm({
    mode: 'edit',
    beneficiaryRecords: [{ ...SAVED_COUNTS, year: 2020 }],
  });

  selectYear('2020');
  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '45' } });
  const startSelect = screen.getByLabelText('Año de inicio') as HTMLSelectElement;
  expect([...startSelect.options].some((option) => option.value === '2022')).toBe(false);
  expect([...startSelect.options].some((option) => option.value === '2020')).toBe(true);

  const yearSelect = screen.getByLabelText('Año de beneficiarios') as HTMLSelectElement;
  expect([...yearSelect.options].some((option) => option.value === '2020')).toBe(true);
  expect(yearSelect.value).toBe('2020');
  expect((screen.getByLabelText('Familias') as HTMLInputElement).value).toBe('45');

  selectYear('2026');
  expect(submittedDrafts()).toEqual([expect.objectContaining({ year: '2020', families: '45' })]);
  selectYear('2020');
  expect((screen.getByLabelText('Familias') as HTMLInputElement).value).toBe('45');
  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '0' } });
  expect([...startSelect.options].some((option) => option.value === '2022')).toBe(true);
  fireEvent.change(startSelect, { target: { value: '2022' } });
  expect([...yearSelect.options].some((option) => option.value === '2020')).toBe(false);
  selectYear('2026');
  expect(submittedDrafts()).toEqual([expect.objectContaining({ year: '2020', families: '0' })]);
});

it('prevents moving the start past an unsaved beneficiary draft', () => {
  renderForm();

  selectYear('2021');
  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '12' } });
  selectYear('2026');
  expect(submittedDrafts()).toHaveLength(1);

  const startSelect = screen.getByLabelText('Año de inicio') as HTMLSelectElement;
  expect([...startSelect.options].some((option) => option.value === '2022')).toBe(false);
  expect(submittedDrafts()).toEqual([expect.objectContaining({ year: '2021', families: '12' })]);
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

it('unlocks later start years after clearing an unsaved beneficiary year', () => {
  renderForm();

  selectYear('2020');
  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '5' } });
  selectYear('2022');
  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '12' } });
  selectYear('2021');
  const startSelect = screen.getByLabelText('Año de inicio') as HTMLSelectElement;
  expect([...startSelect.options].some((option) => option.value === '2022')).toBe(false);
  selectYear('2020');
  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '0' } });
  selectYear('2022');
  expect([...startSelect.options].some((option) => option.value === '2022')).toBe(true);
  expect((screen.getByLabelText('Familias') as HTMLInputElement).value).toBe('12');
});

it('shows errors that apply to the whole list of drafts', async () => {
  const submitAction = vi.fn();
  renderForm({
    mode: 'edit',
    submitAction,
    initialValues: {
      name: 'Project',
      startYear: '2020',
      counterpartyTypes: ['publicSector'],
      leadCoordinatorId: '1',
      topicIds: ['1'],
      strategicLineIds: ['1'],
      locations: [{ departmentId: '1', city: 'Pando', neighborhood: '' }],
      beneficiaryDrafts: [{ year: '2026' }],
    },
  });

  fireEvent.submit(screen.getByLabelText('Familias').closest('form') as HTMLFormElement);

  expect(await screen.findByText('No repitas años de beneficiarios')).toBeTruthy();
  expect(submitAction).not.toHaveBeenCalled();
});
