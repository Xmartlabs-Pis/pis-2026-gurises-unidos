import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { ContributorsManager } from '@/components/metrics/contributors-manager';
import {
  createContributor,
  deleteContributor,
  reorderContributors,
} from '@/app/actions/contributors';

vi.mock('@/app/actions/contributors', () => ({
  createContributor: vi.fn(),
  deleteContributor: vi.fn(),
  reorderContributors: vi.fn(),
}));
vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn() } }));

beforeEach(() => vi.resetAllMocks());

test('reorders with the keyboard and persists the new order', async () => {
  vi.mocked(reorderContributors).mockResolvedValue({ success: true, message: 'Orden actualizado' });
  render(
    <ContributorsManager
      contributors={[
        { id: 1, name: 'INAU' },
        { id: 2, name: 'ANEP' },
      ]}
    />
  );
  fireEvent.keyDown(screen.getByRole('button', { name: 'Reordenar INAU' }), { key: 'ArrowRight' });
  await waitFor(() => expect(reorderContributors).toHaveBeenCalledWith([2, 1]));
});

test('reports a rejected reorder and keeps the original order', async () => {
  vi.mocked(reorderContributors).mockResolvedValue({
    success: false,
    message: 'No se pudo guardar el orden.',
  });
  render(
    <ContributorsManager
      contributors={[
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
  vi.mocked(createContributor).mockResolvedValue({
    success: true,
    contributor: { id: 1, name: 'INAU' },
    message: 'Publicado',
  });
  render(<ContributorsManager contributors={[]} />);
  const input = screen.getByRole('textbox') as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'INAU' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  await waitFor(() => expect(createContributor).toHaveBeenCalledWith('INAU'));
  await waitFor(() => expect(input.value).toBe(''));
});

test('keeps the input and explains a rejected creation', async () => {
  vi.mocked(createContributor).mockResolvedValue({
    success: false,
    message: 'Ya existe un contribuyente con ese nombre.',
  });
  render(<ContributorsManager contributors={[]} />);
  const input = screen.getByRole('textbox') as HTMLInputElement;
  fireEvent.change(input, { target: { value: 'INAU' } });
  fireEvent.keyDown(input, { key: 'Enter' });
  expect((await screen.findByRole('alert')).textContent).toContain('Ya existe');
  expect(input.value).toBe('INAU');
});

test('requires confirmation and lets the user cancel deletion', async () => {
  vi.mocked(deleteContributor).mockResolvedValue({ success: true, message: 'Eliminado' });
  render(<ContributorsManager contributors={[{ id: 1, name: 'INAU' }]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar INAU' }));
  expect((await screen.findByRole('alertdialog')).textContent).toContain('Eliminar a INAU');
  expect(deleteContributor).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  expect(deleteContributor).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar INAU' }));
  fireEvent.click(await screen.findByRole('button', { name: /^Eliminar$/ }));
  await waitFor(() => expect(deleteContributor).toHaveBeenCalledWith(1));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
});

test('keeps the confirmation open when deletion fails', async () => {
  vi.mocked(deleteContributor).mockResolvedValue({
    success: false,
    message: 'No se pudo eliminar',
  });
  render(<ContributorsManager contributors={[{ id: 1, name: 'INAU' }]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Eliminar INAU' }));
  fireEvent.click(await screen.findByRole('button', { name: /^Eliminar$/ }));
  expect((await screen.findByRole('alert')).textContent).toContain('No se pudo eliminar');
  expect(screen.getByRole('alertdialog')).toBeDefined();
});
