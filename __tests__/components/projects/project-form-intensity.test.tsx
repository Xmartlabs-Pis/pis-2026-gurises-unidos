import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import type { ComponentProps } from 'react';
import { ProjectForm } from '@/components/projects/form/project-form';
import { BENEFICIARY_CATEGORY_OPTIONS } from '../../mocks/beneficiary-values';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

const DISABLED_HINT = 'Disponible al cargar al menos un NNA directo.';

const EMPTY_COUNTS = {
  directChildrenAdolescents: 0,
  indirectChildrenAdolescents: 0,
  youth18To29: 0,
  families: 0,
  coordinatedInstitutions: 0,
  communityLeaders: 0,
  basicServiceStaff: 0,
};

function renderForm(props: Partial<ComponentProps<typeof ProjectForm>> = {}) {
  const submitAction = vi.fn().mockResolvedValue({});
  const view = render(
    <ProjectForm
      beneficiaryCategories={BENEFICIARY_CATEGORY_OPTIONS}
      topics={[{ id: 1, name: 'Education' }]}
      strategicLines={[{ id: 1, name: 'Community Support' }]}
      currentYear={2026}
      mode="edit"
      coordinators={[{ id: 2, firstName: 'Test', lastName: 'Coordinator' }]}
      departments={[{ id: 3, name: 'Montevideo' }]}
      initialValues={{
        counterpartyType: 'publicSector',
        strategicLineIds: ['1'],
        name: 'Existing project',
        topicIds: ['1'],
        status: 'active',
        leadCoordinatorId: '2',
        departmentIds: ['3'],
        cities: ['Montevideo'],
        startYear: '2020',
        year: '2024',
      }}
      submitAction={submitAction}
      {...props}
    />
  );
  return { ...view, submitAction };
}

async function submit(form: HTMLFormElement) {
  await act(async () => {
    fireEvent.submit(form);
  });
}

it('enables intensity only while there is at least one direct child or adolescent', () => {
  renderForm();
  const intensity = screen.getByLabelText('Intensidad');
  expect(intensity).toHaveProperty('disabled', true);
  expect(screen.getByText(DISABLED_HINT)).toBeTruthy();

  fireEvent.change(screen.getByLabelText('NNA directos'), { target: { value: '3' } });
  expect(intensity).toHaveProperty('disabled', false);
  expect(screen.queryByText(DISABLED_HINT)).toBeNull();

  fireEvent.change(screen.getByLabelText('NNA directos'), { target: { value: '0' } });
  expect(intensity).toHaveProperty('disabled', true);
});

it('enables intensity when another saved year has direct children or adolescents', () => {
  renderForm({
    beneficiaryRecords: [{ ...EMPTY_COUNTS, directChildrenAdolescents: 12, year: 2023 }],
  });
  expect(screen.getByLabelText('Intensidad')).toHaveProperty('disabled', false);
});

it('submits no intensity while the project has no direct children or adolescents', async () => {
  const { container, submitAction } = renderForm({
    initialValues: {
      counterpartyType: 'publicSector',
      strategicLineIds: ['1'],
      name: 'Existing project',
      topicIds: ['1'],
      status: 'active',
      intensity: 'medium',
      leadCoordinatorId: '2',
      departmentIds: ['3'],
      cities: ['Montevideo'],
      startYear: '2020',
      year: '2024',
    },
  });
  await submit(container.querySelector('form')!);
  await waitFor(() => expect(submitAction).toHaveBeenCalledTimes(1));
  const submitted = submitAction.mock.calls[0][1] as FormData;
  expect(submitted.get('intensity')).toBeNull();
});

it('requires intensity once direct children or adolescents are loaded', async () => {
  const { container, submitAction } = renderForm();
  fireEvent.change(screen.getByLabelText('NNA directos'), { target: { value: '3' } });
  await submit(container.querySelector('form')!);
  expect(await screen.findByText('Elegí una intensidad')).toBeTruthy();
  expect(submitAction).not.toHaveBeenCalled();
});
