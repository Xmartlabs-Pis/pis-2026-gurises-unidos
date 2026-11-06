import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { PartnersManagement } from '@/components/partners/partners-management';
import { createPartner } from '@/app/actions/partners';

vi.mock('@/app/actions/partners', () => ({
  createPartner: vi.fn(),
  deletePartner: vi.fn(),
  editPartner: vi.fn(),
}));

const PARTNERS = [
  { id: 5, name: 'INAU', counterpartyType: 'publicSector' as const, _count: { projects: 3 } },
  { id: 8, name: 'BASF', counterpartyType: 'privateSector' as const, _count: { projects: 0 } },
];

it('shows the counterparty type of each partner', () => {
  render(<PartnersManagement partners={PARTNERS} />);

  const inau = screen.getByText('INAU').closest('li');
  const basf = screen.getByText('BASF').closest('li');
  expect(within(inau!).getByText('Sector Público')).toBeDefined();
  expect(within(basf!).getByText('Sector Privado')).toBeDefined();
});

it('links partners with projects to the filtered projects page', () => {
  render(<PartnersManagement partners={PARTNERS} />);

  const inau = screen.getByText('INAU').closest('li');
  expect(within(inau!).getByRole('link', { name: '3 proyectos' }).getAttribute('href')).toBe(
    '/dashboard/projects?partnerId=5&status=all&beneficiaryYear=all'
  );
});

it('keeps the project count as plain text when a partner has no projects', () => {
  render(<PartnersManagement partners={PARTNERS} />);

  const basf = screen.getByText('BASF').closest('li');
  expect(within(basf!).queryByRole('link')).toBeNull();
  expect(within(basf!).getByText('0 proyectos').tagName).toBe('SPAN');
});

it('asks for a counterparty type before creating a partner', () => {
  const { container } = render(<PartnersManagement partners={[]} />);

  fireEvent.change(screen.getByRole('textbox', { name: 'Nombre del socio' }), {
    target: { value: 'INAU' },
  });
  fireEvent.submit(container.querySelector('form')!);

  expect(screen.getByText('Seleccioná un tipo de contraparte')).toBeDefined();
  expect(createPartner).not.toHaveBeenCalled();
});

it('asks for a name before creating a partner', () => {
  const { container } = render(<PartnersManagement partners={[]} />);

  fireEvent.submit(container.querySelector('form')!);

  expect(screen.getByText('Ingresá un nombre para el socio')).toBeDefined();
  expect(createPartner).not.toHaveBeenCalled();
});

it('lets the user edit the type only when the partner has no projects', async () => {
  render(<PartnersManagement partners={PARTNERS} />);

  const basf = screen.getByText('BASF').closest('li');
  fireEvent.click(within(basf!).getByRole('button', { name: 'Editar' }));
  const freeDialog = await screen.findByRole('alertdialog');
  expect(
    within(freeDialog).getByRole('combobox', { name: 'Tipo de contraparte' }).textContent
  ).toContain('Sector Privado');
  expect(within(freeDialog).queryByText(/asociado a proyectos/)).toBeNull();
  fireEvent.click(within(freeDialog).getByRole('button', { name: 'Cancelar' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

  const inau = screen.getByText('INAU').closest('li');
  fireEvent.click(within(inau!).getByRole('button', { name: 'Editar' }));
  const lockedDialog = await screen.findByRole('alertdialog');
  expect(within(lockedDialog).getByText(/asociado a proyectos/)).toBeDefined();
  expect(
    lockedDialog.querySelector<HTMLInputElement>('input[type="hidden"][name="counterpartyType"]')
      ?.value
  ).toBe('publicSector');
});
