import { fireEvent, render, screen, within } from '@testing-library/react';
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
