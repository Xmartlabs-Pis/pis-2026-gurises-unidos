import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ProjectForm } from '@/components/projects/form/project-form';
import { BENEFICIARY_CATEGORY_OPTIONS } from '../../mocks/beneficiary-values';
import { notify } from '@/lib/notify';

const { routerPushMock, routerRefreshMock } = vi.hoisted(() => ({
  routerPushMock: vi.fn(),
  routerRefreshMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPushMock, refresh: routerRefreshMock }),
}));

vi.mock('@/lib/notify', () => ({
  notify: {
    error: vi.fn(),
    success: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
    promise: vi.fn(),
  },
}));

it('submits prefilled values and the recorded year, preserves edits on failure, and allows retry', async () => {
  routerPushMock.mockClear();
  vi.mocked(notify.error).mockClear();
  const submitAction = vi.fn().mockResolvedValue({ formError: 'No se pudo guardar' });
  const { container } = render(
    <ProjectForm
      beneficiaryCategories={BENEFICIARY_CATEGORY_OPTIONS}
      strategicLines={[{ id: 1, name: 'Community Support' }]}
      topics={[{ id: 1, name: 'Education' }]}
      currentYear={2026}
      mode="edit"
      coordinators={[{ id: 2, firstName: 'Test', lastName: 'Coordinator' }]}
      departments={[{ id: 3, name: 'Montevideo' }]}
      initialValues={{
        counterpartyType: 'publicSector',
        name: 'Existing project',
        strategicLineIds: ['1'],
        topicIds: ['1'],
        status: 'active',
        leadCoordinatorId: '2',
        departmentIds: ['3'],
        startYear: '2020',
        year: '2024',
        families: '30',
      }}
      submitAction={submitAction}
      cancelHref="/dashboard/projects/10"
    />
  );
  expect((screen.getByLabelText('Nombre del proyecto') as HTMLInputElement).value).toBe(
    'Existing project'
  );
  expect((screen.getByLabelText('Familias') as HTMLInputElement).value).toBe('30');
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(routerPushMock).toHaveBeenCalledWith('/dashboard/projects/10');
  fireEvent.change(screen.getByLabelText('Nombre del proyecto'), {
    target: { value: 'Edited project' },
  });
  await act(async () => {
    fireEvent.submit(container.querySelector('form')!);
  });
  await waitFor(() => {
    expect(notify.error).toHaveBeenCalledWith({ title: 'No se pudo guardar' });
  });
  expect(submitAction).toHaveBeenCalledTimes(1);
  const submitted = submitAction.mock.calls[0][1] as FormData;
  expect(submitted.get('name')).toBe('Edited project');
  expect(submitted.get('year')).toBe('2024');
  expect(submitted.get('status')).toBe('active');
  expect(submitted.get('families')).toBe('30');
  expect((screen.getByLabelText('Nombre del proyecto') as HTMLInputElement).value).toBe(
    'Edited project'
  );
  expect(Object.fromEntries(new FormData(container.querySelector('form')!))).toEqual(
    Object.fromEntries(submitted)
  );
  await act(async () => {
    fireEvent.submit(container.querySelector('form')!);
  });
  expect(submitAction).toHaveBeenCalledTimes(2);
  expect(Object.fromEntries(submitAction.mock.calls[1][1] as FormData)).toEqual(
    Object.fromEntries(submitted)
  );
});

it('keeps the original creation appearance separate from edit styling', () => {
  const { container } = render(
    <ProjectForm
      beneficiaryCategories={BENEFICIARY_CATEGORY_OPTIONS}
      strategicLines={[{ id: 1, name: 'Community Support' }]}
      topics={[]}
      currentYear={2026}
      coordinators={[]}
      departments={[]}
      submitAction={vi.fn()}
    />
  );
  expect(container.querySelector('form')?.classList.contains('bg-muted/30')).toBe(true);
  expect(screen.queryByText('Cobertura')).toBeNull();
  expect(screen.queryByText('Ver vista pública →')).toBeNull();
  expect(screen.getByLabelText('Nombre del proyecto').classList.contains('md:text-sm')).toBe(true);
  expect(
    screen.getByLabelText('Foto de portada').closest('[data-slot="field"]')?.hasAttribute('hidden')
  ).toBe(true);
  expect(
    screen
      .getByText('Información básica')
      .closest('[data-slot="card"]')
      ?.classList.contains('ring-1')
  ).toBe(true);
  expect(screen.queryByRole('button', { name: 'Guardar borrador' })).toBeNull();
});

it('shows and submits the selected project placeholder during creation', () => {
  const { container } = render(
    <ProjectForm
      beneficiaryCategories={BENEFICIARY_CATEGORY_OPTIONS}
      strategicLines={[{ id: 1, name: 'Community Support' }]}
      topics={[]}
      currentYear={2026}
      coordinators={[]}
      departments={[]}
      initialValues={{
        counterpartyType: 'publicSector',
        coverPhotoUrl: '/images/project-placeholders/2.webp',
      }}
      submitAction={vi.fn()}
    />
  );

  expect(container.querySelector('img')?.getAttribute('src')).toContain(
    'project-placeholders%2F2.webp'
  );
  expect(new FormData(container.querySelector('form')!).get('projectPlaceholder')).toBe(
    '/images/project-placeholders/2.webp'
  );
});

it('sends multiple selected topics and preserves them after a failed save', async () => {
  const submitAction = vi.fn().mockResolvedValue({ formError: 'No se pudo guardar' });
  const { container } = render(
    <ProjectForm
      beneficiaryCategories={BENEFICIARY_CATEGORY_OPTIONS}
      strategicLines={[{ id: 1, name: 'Community Support' }]}
      currentYear={2026}
      topics={[
        { id: 1, name: 'Education' },
        { id: 2, name: 'Health' },
      ]}
      coordinators={[{ id: 2, firstName: 'Test', lastName: 'Coordinator' }]}
      departments={[{ id: 3, name: 'Montevideo' }]}
      initialValues={{
        counterpartyType: 'publicSector',
        name: 'Project',
        strategicLineIds: ['1'],
        leadCoordinatorId: '2',
        departmentIds: ['3'],
        topicIds: ['1'],
      }}
      submitAction={submitAction}
    />
  );
  await act(async () => {
    fireEvent.submit(container.querySelector('form')!);
  });
  expect(submitAction.mock.calls[0][1].getAll('topicIds')).toEqual(['1']);
  expect(screen.getByLabelText('Temáticas').textContent).toContain('Education');
  fireEvent.click(screen.getByLabelText('Temáticas'));
  fireEvent.keyDown(await screen.findByRole('option', { name: 'Health' }), { key: 'Enter' });
  await act(async () => {
    fireEvent.submit(container.querySelector('form')!);
  });
  expect(submitAction.mock.calls[1][1].getAll('topicIds')).toEqual(['1', '2']);
  expect(screen.getByLabelText('Temáticas').textContent).toContain('Education, Health');
});

function renderFormWith(initialValues: Record<string, string>) {
  return render(
    <ProjectForm
      beneficiaryCategories={BENEFICIARY_CATEGORY_OPTIONS}
      strategicLines={[{ id: 1, name: 'Community Support' }]}
      topics={[]}
      currentYear={2026}
      coordinators={[{ id: 2, firstName: 'Test', lastName: 'Coordinator' }]}
      departments={[{ id: 3, name: 'Montevideo' }]}
      initialValues={{
        counterpartyType: 'publicSector',
        name: 'Project',
        strategicLineIds: ['1'],
        leadCoordinatorId: '2',
        departmentIds: ['3'],
        ...initialValues,
      }}
      submitAction={vi.fn()}
    />
  );
}

it('disables the end year unless the project is inactive', () => {
  renderFormWith({ status: 'active' });
  expect((screen.getByLabelText('Año de fin') as HTMLButtonElement).disabled).toBe(true);
  cleanup();
  renderFormWith({ status: 'inactive', startYear: '2020', endYear: '2022' });
  const endYear = screen.getByLabelText('Año de fin') as HTMLButtonElement;
  expect(endYear.disabled).toBe(false);
  expect(endYear.textContent).toContain('2022');
});

it('submits the end year of an inactive project', async () => {
  const submitAction = vi.fn().mockResolvedValue({});
  const { container } = render(
    <ProjectForm
      beneficiaryCategories={BENEFICIARY_CATEGORY_OPTIONS}
      strategicLines={[{ id: 1, name: 'Community Support' }]}
      topics={[{ id: 1, name: 'Education' }]}
      currentYear={2026}
      coordinators={[{ id: 2, firstName: 'Test', lastName: 'Coordinator' }]}
      departments={[{ id: 3, name: 'Montevideo' }]}
      initialValues={{
        counterpartyType: 'publicSector',
        name: 'Project',
        strategicLineIds: ['1'],
        leadCoordinatorId: '2',
        departmentIds: ['3'],
        status: 'inactive',
        startYear: '2020',
        endYear: '2022',
        topicIds: ['1'],
      }}
      submitAction={submitAction}
    />
  );
  await act(async () => {
    fireEvent.submit(container.querySelector('form')!);
  });
  expect(submitAction.mock.calls[0][1].get('endYear')).toBe('2022');
});

it('refreshes the topic list after a selected topic becomes invalid', async () => {
  const submitAction = vi.fn().mockResolvedValue({
    errors: { topicIds: ['Elegí temáticas válidas'] },
  });
  const { container } = render(
    <ProjectForm
      beneficiaryCategories={BENEFICIARY_CATEGORY_OPTIONS}
      strategicLines={[{ id: 1, name: 'Community Support' }]}
      currentYear={2026}
      topics={[{ id: 1, name: 'Education' }]}
      coordinators={[{ id: 2, firstName: 'Test', lastName: 'Coordinator' }]}
      departments={[{ id: 3, name: 'Montevideo' }]}
      initialValues={{
        counterpartyType: 'publicSector',
        name: 'Project',
        strategicLineIds: ['1'],
        leadCoordinatorId: '2',
        departmentIds: ['3'],
        topicIds: ['1'],
      }}
      submitAction={submitAction}
    />
  );
  await act(async () => {
    fireEvent.submit(container.querySelector('form')!);
  });

  expect(routerRefreshMock).toHaveBeenCalledOnce();
});

it('limits the start year to the end year and restores later years when reactivated', async () => {
  renderFormWith({ status: 'inactive', startYear: '2020', endYear: '2022', year: '2020' });
  fireEvent.click(screen.getByLabelText('Año de inicio'));
  expect(await screen.findByRole('option', { name: '2022' })).toBeTruthy();
  expect(screen.queryByRole('option', { name: '2023' })).toBeNull();
  expect(screen.getByRole('option', { name: '2020' })).toBeTruthy();
  fireEvent.keyDown(screen.getByRole('option', { name: '2020' }), { key: 'Enter' });

  fireEvent.click(screen.getByLabelText('Estado'));
  fireEvent.keyDown(await screen.findByRole('option', { name: 'Activo' }), { key: 'Enter' });
  fireEvent.click(screen.getByLabelText('Año de inicio'));
  expect(await screen.findByRole('option', { name: '2026' })).toBeTruthy();
});

it('limits the end year to years at or after the start year', async () => {
  renderFormWith({ status: 'inactive', startYear: '2020', endYear: '2022' });
  fireEvent.click(screen.getByLabelText('Año de fin'));
  expect(await screen.findByRole('option', { name: '2020' })).toBeTruthy();
  expect(screen.getByRole('option', { name: '2026' })).toBeTruthy();
  expect(screen.queryByRole('option', { name: '2019' })).toBeNull();
});

it('clears an invalid end year and advances beneficiaries to the start year', async () => {
  render(
    <ProjectForm
      beneficiaryCategories={BENEFICIARY_CATEGORY_OPTIONS}
      strategicLines={[]}
      topics={[]}
      currentYear={2026}
      coordinators={[]}
      departments={[]}
      initialValues={{
        counterpartyType: 'publicSector',
        status: 'inactive',
        startYear: '2024',
        endYear: '2022',
        year: '2020',
      }}
      beneficiaryRecords={[
        {
          year: 2024,
          directChildrenAdolescents: 0,
          indirectChildrenAdolescents: 0,
          youth18To29: 0,
          families: 7,
          coordinatedInstitutions: 0,
          communityLeaders: 0,
          basicServiceStaff: 0,
        },
      ]}
      submitAction={vi.fn()}
    />
  );
  await waitFor(() => {
    expect(screen.getByLabelText('Año de fin').textContent).toContain('Seleccionar...');
    expect(screen.getByLabelText('Año de beneficiarios').textContent).toContain('2024');
    expect((screen.getByLabelText('Familias') as HTMLInputElement).value).toBe('7');
  });
  expect(
    await screen.findByText('El año de fin es obligatorio para proyectos inactivos')
  ).toBeTruthy();
  expect(
    screen.queryByText('El año de beneficiarios no puede ser anterior al año de inicio')
  ).toBeNull();
  expect(
    screen.queryByText('El año de beneficiarios no puede ser posterior al año de fin')
  ).toBeNull();
  fireEvent.click(screen.getByLabelText('Año de beneficiarios'));
  expect(await screen.findByRole('option', { name: '2024' })).toBeTruthy();
  expect(screen.queryByRole('option', { name: '2022' })).toBeNull();
});

const MANY_CATEGORIES = [
  ...BENEFICIARY_CATEGORY_OPTIONS,
  ...['Docentes', 'Voluntarios', 'Adultos mayores', 'Personas con discapacidad', 'Vecinos'].map(
    (name, index) => ({ key: `custom${index}` as const, name })
  ),
];

function renderWithManyCategories(
  submitAction = vi.fn().mockResolvedValue({}),
  initialValues: Record<string, string> = {}
) {
  return render(
    <ProjectForm
      beneficiaryCategories={MANY_CATEGORIES}
      strategicLines={[{ id: 1, name: 'Community Support' }]}
      topics={[{ id: 1, name: 'Education' }]}
      currentYear={2026}
      mode="edit"
      coordinators={[{ id: 2, firstName: 'Test', lastName: 'Coordinator' }]}
      departments={[{ id: 3, name: 'Montevideo' }]}
      initialValues={{
        counterpartyType: 'publicSector',
        name: 'Existing project',
        strategicLineIds: ['1'],
        topicIds: ['1'],
        leadCoordinatorId: '2',
        departmentIds: ['3'],
        startYear: '2020',
        ...initialValues,
      }}
      submitAction={submitAction}
    />
  );
}

function isHidden(label: string) {
  return Boolean(screen.getByLabelText(label).closest('[hidden]'));
}

it('hides the beneficiary categories after the first ten behind a toggle', () => {
  renderWithManyCategories();

  expect(isHidden('Docentes')).toBe(false);
  expect(isHidden('Adultos mayores')).toBe(false);
  expect(isHidden('Personas con discapacidad')).toBe(true);
  expect(isHidden('Vecinos')).toBe(true);

  fireEvent.click(screen.getByRole('button', { name: 'Mostrar 2 categorías más' }));

  expect(isHidden('Vecinos')).toBe(false);
  expect(screen.getByRole('button', { name: 'Mostrar menos' })).toBeTruthy();
  cleanup();
});

it('submits the hidden beneficiary categories with their stored values', async () => {
  const submitAction = vi.fn().mockResolvedValue({});
  const { container } = renderWithManyCategories(submitAction, { custom4: '0' });

  fireEvent.change(screen.getByLabelText('Familias'), { target: { value: '12' } });
  await act(async () => {
    fireEvent.submit(container.querySelector('form')!);
  });

  await waitFor(() => expect(submitAction).toHaveBeenCalledTimes(1));
  const submitted = submitAction.mock.calls[0][1] as FormData;
  expect(submitted.get('families')).toBe('12');
  expect(submitted.get('custom3')).toBe('0');
  expect(submitted.get('custom4')).toBe('0');
  cleanup();
});

it('starts expanded when a hidden beneficiary category has a value', () => {
  renderWithManyCategories(undefined, { custom3: '5' });

  expect(isHidden('Vecinos')).toBe(false);
  expect((screen.getByLabelText('Personas con discapacidad') as HTMLInputElement).value).toBe('5');
  expect(screen.getByRole('button', { name: 'Mostrar menos' })).toBeTruthy();
  cleanup();
});

it.each(['create', 'edit'] as const)(
  'shows counterparty options and submits changes in %s mode',
  async (mode) => {
    const submitAction = vi.fn().mockResolvedValue({ formError: 'No se pudo guardar' });
    const { container } = render(
      <ProjectForm
        beneficiaryCategories={BENEFICIARY_CATEGORY_OPTIONS}
        strategicLines={[{ id: 1, name: 'Community Support' }]}
        mode={mode}
        currentYear={2026}
        topics={[{ id: 1, name: 'Education' }]}
        coordinators={[{ id: 2, firstName: 'Test', lastName: 'Coordinator' }]}
        departments={[{ id: 3, name: 'Montevideo' }]}
        initialValues={{
          name: 'Project',
          topicIds: ['1'],
          leadCoordinatorId: '2',
          departmentIds: ['3'],
          counterpartyType: mode === 'edit' ? 'publicSector' : '',
          strategicLineIds: ['1'],
        }}
        submitAction={submitAction}
      />
    );
    const field = screen.getByLabelText('Contraparte');
    expect(field.textContent).toContain(
      mode === 'edit' ? 'Sector Público' : 'Seleccionar contraparte...'
    );
    if (mode === 'create') {
      await act(async () => {
        fireEvent.submit(container.querySelector('form')!);
      });
      expect(submitAction).not.toHaveBeenCalled();
      expect(await screen.findByText('Seleccioná una contraparte válida')).toBeTruthy();
    }
    fireEvent.click(field);
    const options = await screen.findAllByRole('option');
    expect(options.map((option) => option.textContent)).toEqual([
      'Sector Público',
      'Sector Privado',
      'Cooperación Internacional',
    ]);
    fireEvent.keyDown(screen.getByRole('option', { name: 'Sector Privado' }), { key: 'Enter' });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    expect(submitAction).toHaveBeenCalledTimes(1);
    expect(submitAction.mock.calls[0][1].get('counterpartyType')).toBe('privateSector');
    expect(field.textContent).toContain('Sector Privado');
    fireEvent.click(field);
    fireEvent.keyDown(await screen.findByRole('option', { name: 'Cooperación Internacional' }), {
      key: 'Enter',
    });
    await act(async () => {
      fireEvent.submit(container.querySelector('form')!);
    });
    expect(submitAction).toHaveBeenCalledTimes(2);
    expect(submitAction.mock.calls[1][1].get('counterpartyType')).toBe('internationalCooperation');
    expect(field.textContent).toContain('Cooperación Internacional');
  }
);
