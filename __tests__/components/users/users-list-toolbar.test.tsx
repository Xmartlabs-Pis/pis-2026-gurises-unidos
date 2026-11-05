import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { changeSearch, updateFilters, clearFilters, urlFiltersOptions } = vi.hoisted(() => ({
  changeSearch: vi.fn(),
  updateFilters: vi.fn(),
  clearFilters: vi.fn(),
  urlFiltersOptions: vi.fn(),
}));

vi.mock('@/hooks/use-url-filters', () => ({
  useUrlFilters: (options: { search?: string }) => {
    urlFiltersOptions(options);
    return {
      searchText: options.search ?? '',
      changeSearch,
      updateFilters,
      clearFilters,
    };
  },
}));

import { UsersListToolbar } from '@/components/users/users-list-toolbar';

async function chooseOption(triggerLabel: string, optionLabel: string) {
  fireEvent.click(screen.getByRole('combobox', { name: triggerLabel }));
  fireEvent.keyDown(await screen.findByRole('option', { name: optionLabel }), { key: 'Enter' });
}

beforeEach(() => {
  changeSearch.mockClear();
  updateFilters.mockClear();
  clearFilters.mockClear();
});

describe('UsersListToolbar', () => {
  test('shows the active filters and the result count', () => {
    render(
      <UsersListToolbar
        filters={{ search: 'ana', role: 'admin', status: 'disabled', sortBy: 'status' }}
        filteredCount={2}
      />
    );

    expect((screen.getByLabelText('Buscar usuarios') as HTMLInputElement).value).toBe('ana');
    expect(screen.getByRole('combobox', { name: 'Filtrar por rol' }).textContent).toContain(
      'Administrador'
    );
    expect(screen.getByRole('combobox', { name: 'Filtrar por estado' }).textContent).toContain(
      'Deshabilitado'
    );
    expect(screen.getByText('2 usuarios')).toBeDefined();
  });

  test('defaults to all roles and statuses', () => {
    render(<UsersListToolbar filters={{}} filteredCount={0} />);

    expect(screen.getByRole('combobox', { name: 'Filtrar por rol' }).textContent).toContain(
      'Todos los roles'
    );
    expect(screen.getByRole('combobox', { name: 'Filtrar por estado' }).textContent).toContain(
      'Todos los estados'
    );
    expect(screen.getByText('No hay resultados')).toBeDefined();
  });

  test('keeps the search in the q URL param', () => {
    render(<UsersListToolbar filters={{ search: 'ana' }} filteredCount={1} />);

    expect(urlFiltersOptions).toHaveBeenCalledWith({ search: 'ana', searchKey: 'q' });
  });

  test('forwards the typed search', () => {
    render(<UsersListToolbar filters={{}} filteredCount={1} />);

    fireEvent.change(screen.getByLabelText('Buscar usuarios'), { target: { value: 'mar' } });

    expect(changeSearch).toHaveBeenCalledExactlyOnceWith('mar');
  });

  test('applies a selected role', async () => {
    render(<UsersListToolbar filters={{}} filteredCount={1} />);

    await chooseOption('Filtrar por rol', 'Coordinador');

    expect(updateFilters).toHaveBeenCalledExactlyOnceWith({ role: 'coordinator' });
  });

  test('removes the role filter when selecting all roles', async () => {
    render(<UsersListToolbar filters={{ role: 'admin' }} filteredCount={1} />);

    await chooseOption('Filtrar por rol', 'Todos los roles');

    expect(updateFilters).toHaveBeenCalledExactlyOnceWith({ role: null });
  });

  test('applies a selected status', async () => {
    render(<UsersListToolbar filters={{}} filteredCount={1} />);

    await chooseOption('Filtrar por estado', 'Activo');

    expect(updateFilters).toHaveBeenCalledExactlyOnceWith({ status: 'active' });
  });

  test('applies a selected sort and omits the default one', async () => {
    const { unmount } = render(<UsersListToolbar filters={{}} filteredCount={1} />);

    await chooseOption('Ordenar por', 'Rol');
    expect(updateFilters).toHaveBeenLastCalledWith({ sort: 'role' });
    unmount();

    render(<UsersListToolbar filters={{ sortBy: 'role' }} filteredCount={1} />);

    await chooseOption('Ordenar por', 'Nombre');
    expect(updateFilters).toHaveBeenLastCalledWith({ sort: null });
  });

  test('clears the filters from the mobile sheet', async () => {
    render(<UsersListToolbar filters={{ role: 'admin' }} filteredCount={1} />);

    fireEvent.click(screen.getByRole('button', { name: 'Filtros' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Limpiar' }));

    expect(clearFilters).toHaveBeenCalledExactlyOnceWith(['role', 'status', 'sort']);
  });
});
