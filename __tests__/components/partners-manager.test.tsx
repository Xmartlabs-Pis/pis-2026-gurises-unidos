import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { PartnersManager } from '@/components/metrics/partners-manager';
import { createPartner, deletePartner, reorderPartners } from '@/app/actions/partners';

vi.mock('@/app/actions/partners', () => ({
  createPartner: vi.fn(),
  deletePartner: vi.fn(),
  reorderPartners: vi.fn(),
}));
vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn() } }));

beforeEach(() => vi.resetAllMocks());

test('reorders with the keyboard and persists the new order', async () => {
  vi.mocked(reorderPartners).mockResolvedValue({ success: true, message: 'Orden actualizado' });
  render(
    <PartnersManager
      partners={[
        { id: 1, name: 'INAU' },
        { id: 2, name: 'ANEP' },
      ]}
    />
  );
  fireEvent.keyDown(screen.getByRole('button', { name: 'Reordenar INAU' }), { key: 'ArrowRight' });
  await waitFor(() => expect(reorderPartners).toHaveBeenCalledWith([2, 1]));
});

test('reports a rejected reorder and keeps the original order', async () => {
  vi.mocked(reorderPartners).mockResolvedValue({
    success: false,
    message: 'No se pudo guardar el orden.',
  });
  render(
    <PartnersManager
      partners={[
        { id: 1, name: 'INAU' },
        { id: 2, name: 'ANEP' },
      ]}
    />
  );
  fireEvent.keyDown(screen.getByRole('button', { name: 'Reordenar INAU' }), { key: 'ArrowRight' });
  expect((await screen.findByRole('alert')).textContent).toContain('No se pudo guardar');
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['INAU', 'ANEP']);
});

test('publishes on Enter and clears the input only after success', async () => {
  vi.mocked(createPartner).mockResolvedValue({
    success: true,
    partner: { id: 1, name: 'INAU' },
    message: 'Publicado',
  });
  render(<PartnersManager partners={[]} />);
  const input = screen.getByRole('textbox') as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'INAU' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(createPartner).toHaveBeenCalledWith('INAU'));
  await waitFor(() => expect(input.value).toBe(''));
});

test('keeps the input and explains a rejected creation', async () => {
  vi.mocked(createPartner).mockResolvedValue({
    success: false,
    message: 'Ya existe un contribuyente con ese nombre.',
  });
  render(<PartnersManager partners={[]} />);
  const input = screen.getByRole('textbox') as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'INAU' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect((await screen.findByRole('alert')).textContent).toContain('Ya existe');
  expect(input.value).toBe('INAU');
});

test('requires confirmation and lets the user cancel deletion', async () => {
  vi.mocked(deletePartner).mockResolvedValue({ success: true, message: 'Eliminado' });
  render(<PartnersManager partners={[{ id: 1, name: 'INAU' }]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar INAU' }));
  expect((await screen.findByRole('alertdialog')).textContent).toContain('Eliminar a INAU');
  expect(deletePartner).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  expect(deletePartner).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar INAU' }));
  fireEvent.click(await screen.findByRole('button', { name: /^Eliminar$/ }));
  await waitFor(() => expect(deletePartner).toHaveBeenCalledWith(1));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
});

test('keeps the confirmation open when deletion fails', async () => {
  vi.mocked(deletePartner).mockResolvedValue({
    success: false,
    message: 'No se pudo eliminar',
  });
  render(<PartnersManager partners={[{ id: 1, name: 'INAU' }]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar INAU' }));
  fireEvent.click(await screen.findByRole('button', { name: /^Eliminar$/ }));
  expect((await screen.findByRole('alert')).textContent).toContain('No se pudo eliminar');
  expect(screen.getByRole('alertdialog')).toBeDefined();
});
