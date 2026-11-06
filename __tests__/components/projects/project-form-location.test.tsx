import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
        counterpartyTypes: ['publicSector'],
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
  fireEvent.click(screen.getByLabelText('Departamento'));
  fireEvent.keyDown(await screen.findByRole('option', { name }), { key: 'Enter' });
}

async function selectRegion(name: string) {
  fireEvent.click(screen.getByLabelText('Región'));
  fireEvent.keyDown(await screen.findByRole('option', { name }), { key: 'Enter' });
}

function type(label: string, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
}

function getInput(label: string) {
  return screen.getByLabelText(label) as HTMLInputElement;
}

function addLocation() {
  fireEvent.click(screen.getByRole('button', { name: 'Agregar' }));
}

function isAddDisabled() {
  return (screen.getByRole('button', { name: 'Agregar' }) as HTMLButtonElement).disabled;
}

function invalidControls() {
  return [
    screen.getByLabelText('Departamento'),
    screen.getByLabelText('Ciudad'),
    screen.getByLabelText('Barrio (opcional)'),
    screen.getByRole('button', { name: 'Agregar' }),
  ]
    .filter((control) => control.getAttribute('aria-invalid') === 'true')
    .map((control) => control.id || control.textContent);
}

function addedLocations() {
  const list = screen.queryByRole('list', { name: 'Ubicaciones agregadas' });
  return list
    ? within(list)
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    : [];
}

function location(departmentId: string, city = '', neighborhood = '') {
  return JSON.stringify({ departmentId, city, neighborhood });
}

it('requires a department and a city before adding a location', async () => {
  renderForm();

  expect(getInput('Ciudad').disabled).toBe(true);
  expect(getInput('Barrio (opcional)').disabled).toBe(true);
  expect(isAddDisabled()).toBe(true);

  await selectDepartment('Canelones');
  await waitFor(() => expect(getInput('Ciudad').disabled).toBe(false));
  expect(getInput('Barrio (opcional)').disabled).toBe(true);
  expect(isAddDisabled()).toBe(true);

  type('Ciudad', ' ');
  expect(isAddDisabled()).toBe(true);

  type('Ciudad', 'Las Piedras');
  expect(getInput('Barrio (opcional)').disabled).toBe(false);
  expect(isAddDisabled()).toBe(false);
});

it('submits each city and neighborhood associated with its department', async () => {
  const { submitAction, submit } = renderForm();

  await selectDepartment('Montevideo');
  type('Ciudad', 'Montevideo');
  addTag('Barrio (opcional)', 'Cerro Norte');
  expect(getInput('Ciudad').value).toBe('Montevideo');
  expect(getInput('Barrio (opcional)').value).toBe('');
  addTag('Barrio (opcional)', ' Casavalle ');

  await selectDepartment('Canelones');
  type('Ciudad', 'Las Piedras');
  addLocation();
  expect(getInput('Ciudad').value).toBe('');

  await selectDepartment('Montevideo');
  addTag('Ciudad', 'Pando');

  expect(addedLocations()).toEqual([
    'Montevideo, Montevideo, Cerro Norte',
    'Montevideo, Montevideo, Casavalle',
    'Montevideo, Pando',
    'Canelones, Las Piedras',
  ]);

  await submit();

  await waitFor(() => expect(submitAction).toHaveBeenCalledTimes(1));
  const submitted = submitAction.mock.calls[0][1] as FormData;
  expect(submitted.get('geographicScope')).toBe('national');
  expect(submitted.getAll('locations')).toEqual([
    location('3', 'Montevideo', 'Cerro Norte'),
    location('3', 'Montevideo', 'Casavalle'),
    location('3', 'Pando'),
    location('4', 'Las Piedras'),
  ]);
});

it('rejects a repeated location ignoring case', async () => {
  renderForm({ locations: [{ departmentId: '3', city: 'Montevideo', neighborhood: 'Centro' }] });

  await selectDepartment('Montevideo');
  type('Ciudad', 'montevideo');
  addTag('Barrio (opcional)', 'CENTRO');

  expect(screen.getByText('Esa ubicación ya está agregada')).toBeTruthy();
  expect(invalidControls()).toEqual(['locationNeighborhood']);
  expect(addedLocations()).toEqual(['Montevideo, Montevideo, Centro']);
});

it('marks the city when a repeated location has no neighborhood', async () => {
  renderForm({ locations: [{ departmentId: '3', city: 'Montevideo', neighborhood: '' }] });

  await selectDepartment('Montevideo');
  addTag('Ciudad', 'montevideo');

  expect(screen.getByText('Esa ubicación ya está agregada')).toBeTruthy();
  expect(invalidControls()).toEqual(['locationCity']);
});

it('removes a single location', async () => {
  const { submitAction, submit } = renderForm({
    locations: [
      { departmentId: '3', city: 'Montevideo', neighborhood: 'Centro' },
      { departmentId: '4', city: 'Las Piedras', neighborhood: '' },
    ],
  });

  fireEvent.click(screen.getByRole('button', { name: 'Quitar Montevideo, Montevideo, Centro' }));
  expect(addedLocations()).toEqual(['Canelones, Las Piedras']);

  await submit();
  await waitFor(() => expect(submitAction).toHaveBeenCalledTimes(1));
  expect((submitAction.mock.calls[0][1] as FormData).getAll('locations')).toEqual([
    location('4', 'Las Piedras'),
  ]);
});

it('requires at least one location for a national project', async () => {
  const { submitAction, submit } = renderForm();

  await submit();

  expect(await screen.findByText('Agregá al menos una ubicación')).toBeTruthy();
  expect(invalidControls()).toEqual(['locationDepartment']);
  expect(submitAction).not.toHaveBeenCalled();
});

it('marks the city instead of the department when a department is selected without a city', async () => {
  const { submitAction, submit } = renderForm();

  await selectDepartment('Canelones');
  await submit();

  expect(await screen.findByText('Agregá al menos una ubicación')).toBeTruthy();
  expect(invalidControls()).toEqual(['locationCity']);
  expect(submitAction).not.toHaveBeenCalled();
});

it('asks to add a typed location that was not added before saving', async () => {
  const { submitAction, submit } = renderForm();

  await selectDepartment('Canelones');
  type('Ciudad', 'Las Piedras');
  expect(
    screen.getByText('Presioná "Agregar" para sumar la ubicación. El barrio es opcional')
  ).toBeTruthy();

  await submit();

  expect(
    await screen.findByText('Presioná "Agregar" para sumar la ubicación que escribiste')
  ).toBeTruthy();
  expect(invalidControls()).toEqual(['Agregar']);
  expect(submitAction).not.toHaveBeenCalled();
});

it('requires a city for a stored department without one', async () => {
  const { submitAction, submit } = renderForm({
    locations: [{ departmentId: '4', city: '', neighborhood: '' }],
  });

  await submit();

  expect(await screen.findByText('Ingresá al menos una ciudad')).toBeTruthy();
  expect(submitAction).not.toHaveBeenCalled();
});

it('requires a region but not a country for an international project', async () => {
  const { submitAction, submit } = renderForm({
    locations: [{ departmentId: '3', city: 'Montevideo', neighborhood: '' }],
  });

  fireEvent.click(screen.getByLabelText('Internacional', { selector: '[role=radio]' }));
  expect(await screen.findByLabelText('Países (opcional)')).toBeTruthy();
  expect(screen.queryByLabelText('Departamento')).toBeNull();

  await submit();
  await waitFor(() =>
    expect(screen.getByLabelText('Región').getAttribute('aria-invalid')).toBe('true')
  );
  expect(submitAction).not.toHaveBeenCalled();

  await selectRegion('Otras regiones');
  await submit();

  await waitFor(() => expect(submitAction).toHaveBeenCalledTimes(1));
  const submitted = submitAction.mock.calls[0][1] as FormData;
  expect(submitted.get('geographicScope')).toBe('international');
  expect(submitted.getAll('region')).toEqual(['otherRegions']);
  expect(submitted.getAll('countries')).toEqual([]);
  expect(submitted.getAll('locations')).toEqual([]);
});

it('loads several countries for an international project', async () => {
  const { submitAction, submit } = renderForm({
    geographicScope: 'international',
    region: 'southAmerica',
  });

  addTag('Países (opcional)', 'Argentina');
  addTag('Países (opcional)', 'Brasil');
  await submit();

  await waitFor(() => expect(submitAction).toHaveBeenCalledTimes(1));
  expect((submitAction.mock.calls[0][1] as FormData).getAll('countries')).toEqual([
    'Argentina',
    'Brasil',
  ]);
});

it('shows the region dropdown next to the countries only for an international project', async () => {
  renderForm();

  expect(screen.queryByLabelText('Región')).toBeNull();

  fireEvent.click(screen.getByLabelText('Internacional', { selector: '[role=radio]' }));
  fireEvent.click(await screen.findByLabelText('Región'));
  expect((await screen.findAllByRole('option')).map((option) => option.textContent)).toEqual([
    'Sudamérica',
    'Norteamérica',
    'Centroamérica',
    'Otras regiones',
  ]);
  fireEvent.keyDown(screen.getByRole('option', { name: 'Sudamérica' }), { key: 'Escape' });
  expect(screen.getByLabelText('Países (opcional)')).toBeTruthy();

  fireEvent.click(screen.getByLabelText('Nacional', { selector: '[role=radio]' }));
  await waitFor(() => expect(screen.queryByLabelText('Región')).toBeNull());
});

it('loads the stored region and submits the one selected instead', async () => {
  const { submitAction, submit } = renderForm({
    geographicScope: 'international',
    countries: ['Argentina'],
    region: 'southAmerica',
  });

  expect(screen.getByLabelText('Región').textContent).toContain('Sudamérica');

  await selectRegion('Norteamérica');
  addTag('Países (opcional)', 'México');
  await submit();

  await waitFor(() => expect(submitAction).toHaveBeenCalledTimes(1));
  const submitted = submitAction.mock.calls[0][1] as FormData;
  expect(submitted.getAll('region')).toEqual(['northAmerica']);
  expect(submitted.getAll('countries')).toEqual(['Argentina', 'México']);
});
