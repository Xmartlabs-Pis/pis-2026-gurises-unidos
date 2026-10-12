import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { ProjectForm } from '@/components/projects/form/project-form';
import { BENEFICIARY_CATEGORY_OPTIONS } from '../../mocks/beneficiary-values';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

function renderForm(submitAction = vi.fn().mockResolvedValue({})) {
  const view = render(
    <ProjectForm
      beneficiaryCategories={BENEFICIARY_CATEGORY_OPTIONS}
      topics={[{ id: 1, name: 'Education' }]}
      currentYear={2026}
      mode="edit"
      coordinators={[{ id: 2, firstName: 'Test', lastName: 'Coordinator' }]}
      departments={[{ id: 3, name: 'Montevideo' }]}
      initialValues={{
        counterpartyType: 'publicSector',
        name: 'Existing project',
        topicId: '1',
        status: 'active',
        intensity: 'medium',
        leadCoordinatorId: '2',
        departmentId: '3',
        startYear: '2020',
        year: '2024',
      }}
      submitAction={submitAction}
    />
  );
  return { ...view, submitAction };
}

it('enables intensity only while there is at least one direct child or adolescent', () => {
  renderForm();
  const intensity = screen.getByLabelText('Intensidad');
  expect(intensity).toHaveProperty('disabled', true);
  expect(screen.getByText('Disponible al cargar al menos un NNA directo.')).toBeTruthy();

  fireEvent.change(screen.getByLabelText('NNA directos'), { target: { value: '3' } });
  expect(intensity).toHaveProperty('disabled', false);
  expect(screen.queryByText('Disponible al cargar al menos un NNA directo.')).toBeNull();

  fireEvent.change(screen.getByLabelText('NNA directos'), { target: { value: '0' } });
  expect(intensity).toHaveProperty('disabled', true);
});

it('submits the stored intensity even while the field is disabled', async () => {
  const { container, submitAction } = renderForm();
  await act(async () => {
    fireEvent.submit(container.querySelector('form')!);
  });
  await waitFor(() => expect(submitAction).toHaveBeenCalledTimes(1));
  const submitted = submitAction.mock.calls[0][1] as FormData;
  expect(submitted.getAll('intensity')).toEqual(['medium']);
});
