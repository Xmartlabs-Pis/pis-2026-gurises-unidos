import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { PartnersManager } from '@/components/metrics/partners-manager';
import { reorderPartners, setPartnerVisibility } from '@/app/actions/partners';

vi.mock('@/app/actions/partners', () => ({
  placePartner: vi.fn(),
  reorderPartners: vi.fn(),
  setPartnerVisibility: vi.fn(),
}));
vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn() } }));

beforeEach(() => vi.resetAllMocks());

test('reorders with the keyboard and persists the new order', async () => {
  vi.mocked(reorderPartners).mockResolvedValue({ success: true, message: 'Orden actualizado' });
  render(
    <PartnersManager
      partners={[
        { id: 1, name: 'INAU', showPublicly: true },
        { id: 2, name: 'ANEP', showPublicly: true },
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
        { id: 1, name: 'INAU', showPublicly: true },
        { id: 2, name: 'ANEP', showPublicly: true },
      ]}
    />
  );
  fireEvent.keyDown(screen.getByRole('button', { name: 'Reordenar INAU' }), { key: 'ArrowRight' });
  expect((await screen.findByRole('alert')).textContent).toContain('No se pudo guardar');
  expect(screen.getAllByRole('listitem').map((item) => item.textContent)).toEqual(['INAU', 'ANEP']);
});

test('does not offer creating or deleting partners', () => {
  render(<PartnersManager partners={[{ id: 1, name: 'INAU', showPublicly: true }]} />);
  expect(screen.queryByRole('textbox')).toBeNull();
  expect(screen.queryByRole('button', { name: /Eliminar/ })).toBeNull();
});

test.each([
  { showPublicly: true, next: false },
  { showPublicly: false, next: true },
])('toggles public visibility from $showPublicly', async ({ showPublicly, next }) => {
  vi.mocked(setPartnerVisibility).mockResolvedValue({ success: true, message: 'Actualizado' });
  render(<PartnersManager partners={[{ id: 1, name: 'INAU', showPublicly }]} />);
  const toggle = screen.getByRole('button', { name: 'Mostrar INAU en el sitio público' });
  expect(toggle.getAttribute('aria-pressed')).toBe(String(showPublicly));
  fireEvent.click(toggle);
  await waitFor(() => expect(setPartnerVisibility).toHaveBeenCalledWith(1, next));
});

test('reports a rejected visibility change', async () => {
  vi.mocked(setPartnerVisibility).mockResolvedValue({
    success: false,
    message: 'No se pudo actualizar la visibilidad.',
  });
  render(<PartnersManager partners={[{ id: 1, name: 'INAU', showPublicly: true }]} />);
  fireEvent.click(screen.getByRole('button', { name: 'Mostrar INAU en el sitio público' }));
  expect((await screen.findByRole('alert')).textContent).toContain('No se pudo actualizar');
});

test('lists hidden partners below the visible ones without letting them be reordered', () => {
  render(
    <PartnersManager
      partners={[
        { id: 1, name: 'BASF', showPublicly: false },
        { id: 2, name: 'INAU', showPublicly: true },
      ]}
    />
  );
  const [visibleList, hiddenList] = screen.getAllByRole('list');
  expect(visibleList.getAttribute('aria-label')).toBe('Socios visibles');
  expect(visibleList.textContent).toContain('INAU');
  expect(hiddenList.getAttribute('aria-label')).toBe('Socios ocultos');
  expect(hiddenList.textContent).toContain('BASF');
  expect(screen.queryByRole('button', { name: 'Reordenar BASF' })).toBeNull();
});

test('keeps hidden partners after the visible ones when saving the order', async () => {
  vi.mocked(reorderPartners).mockResolvedValue({ success: true, message: 'Orden actualizado' });
  render(
    <PartnersManager
      partners={[
        { id: 1, name: 'INAU', showPublicly: true },
        { id: 2, name: 'BASF', showPublicly: false },
        { id: 3, name: 'ANEP', showPublicly: true },
      ]}
    />
  );
  fireEvent.keyDown(screen.getByRole('button', { name: 'Reordenar INAU' }), { key: 'ArrowRight' });
  await waitFor(() => expect(reorderPartners).toHaveBeenCalledWith([3, 1, 2]));
});
