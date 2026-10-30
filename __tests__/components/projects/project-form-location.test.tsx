import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ProjectForm } from '@/components/projects/form/project-form';
import type { ProjectFormValues } from '@/components/projects/form/project-form-values';
import { BENEFICIARY_CATEGORY_OPTIONS } from '../../mocks/beneficiary-values';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

vi.mock('@/lib/notify', () => ({
  notify: { error: vi.fn(), success: vi.fn(), info: vi.fn(), warning: vi.fn(), promise: vi.fn() },
}));

afterEach(cleanup);

function renderForm(initialValues: Partial<ProjectFormValues> = {}) {
  const submitAction = vi.fn().mockResolvedValue({});
  const { container } = render(
    <ProjectForm
      beneficiaryCategories={BENEFICIARY_CATEGORY_OPTIONS}
      strategicLines={[{ id: 1, name: 'Community Support' }]}
      topics={[{ id: 1, name: 'Education' }]}
      currentYear={2026}
      mode="edit"
      coordinators={[{ id: 2, firstName: 'Test', lastName: 'Coordinator' }]}
      departments={[
        { id: 3, name: 'Montevideo' },
        { id: 4, name: 'Canelones' },
      ]}
      initialValues={{
        counterpartyType: 'publicSector',
        name: 'Project',
        strategicLineIds: ['1'],
        topicIds: ['1'],
        leadCoordinatorId: '2',
        startYear: '2020',
        ...initialValues,
      }}
      submitAction={submitAction}
    />
  );
  const submit = () =>
    act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
  return { submitAction, submit };
}

function addTag(label: string, value: string) {
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value } });
  fireEvent.keyDown(input, { key: 'Enter' });
}

async function selectDepartment(name: string) {
  fireEvent.click(screen.getByLabelText('Departamentos'));
  fireEvent.keyDown(await screen.findByRole('option', { name }), { key: 'Enter' });
}

function isDisabled(label: string) {
  return (screen.getByLabelText(label) as HTMLInputElement).disabled;
}

it('enables cities after a department and neighborhoods after a city', async () => {
  renderForm();

  expect(isDisabled('Ciudades (opcional)')).toBe(true);
  expect(isDisabled('Barrios (opcional)')).toBe(true);

  await selectDepartment('Canelones');
  await waitFor(() => expect(isDisabled('Ciudades (opcional)')).toBe(false));
  expect(isDisabled('Barrios (opcional)')).toBe(true);

  addTag('Ciudades (opcional)', 'Las Piedras');
  await waitFor(() => expect(isDisabled('Barrios (opcional)')).toBe(false));
});

it('submits several departments, cities and neighborhoods', async () => {
  const { submitAction, submit } = renderForm({ departmentIds: ['3', '4'] });

  addTag('Ciudades (opcional)', 'Las Piedras');
  addTag('Ciudades (opcional)', 'Pando');
  addTag('Ciudades (opcional)', ' pando ');
  await waitFor(() => expect(isDisabled('Barrios (opcional)')).toBe(false));
  addTag('Barrios (opcional)', 'Centro');
  addTag('Barrios (opcional)', 'Barrio Obrero');
  fireEvent.click(screen.getByRole('button', { name: 'Quitar Barrio Obrero' }));
  await submit();

  await waitFor(() => expect(submitAction).toHaveBeenCalledTimes(1));
  const submitted = submitAction.mock.calls[0][1] as FormData;
  expect(submitted.get('geographicScope')).toBe('national');
  expect(submitted.getAll('departmentIds')).toEqual(['3', '4']);
  expect(submitted.getAll('cities')).toEqual(['Las Piedras', 'Pando']);
  expect(submitted.getAll('neighborhoods')).toEqual(['Centro']);
});

it('clears the dependent levels when their parent values are removed', async () => {
  renderForm({ departmentIds: ['3'], cities: ['Montevideo'], neighborhoods: ['Centro'] });

  fireEvent.click(screen.getByRole('button', { name: 'Quitar Montevideo' }));

  await waitFor(() => expect(isDisabled('Barrios (opcional)')).toBe(true));
  expect(screen.queryByRole('button', { name: 'Quitar Centro' })).toBeNull();

  await selectDepartment('Montevideo');
  await waitFor(() => expect(isDisabled('Ciudades (opcional)')).toBe(true));
});

it('requires at least one department for a national project', async () => {
  const { submitAction, submit } = renderForm();

  await submit();

  expect(await screen.findByText('Seleccioná al menos un departamento')).toBeTruthy();
  expect(submitAction).not.toHaveBeenCalled();
});

it('loads several countries for an international project', async () => {
  const { submitAction, submit } = renderForm({ departmentIds: ['3'], cities: ['Montevideo'] });

  fireEvent.click(screen.getByLabelText('Internacional', { selector: '[role=radio]' }));
  expect(await screen.findByLabelText('Países')).toBeTruthy();
  expect(screen.queryByLabelText('Departamentos')).toBeNull();

  await submit();
  expect(await screen.findByText('Ingresá al menos un país')).toBeTruthy();
  expect(submitAction).not.toHaveBeenCalled();

  addTag('Países', 'Argentina');
  addTag('Países', 'Brasil');
  await submit();

  await waitFor(() => expect(submitAction).toHaveBeenCalledTimes(1));
  const submitted = submitAction.mock.calls[0][1] as FormData;
  expect(submitted.get('geographicScope')).toBe('international');
  expect(submitted.getAll('countries')).toEqual(['Argentina', 'Brasil']);
});
