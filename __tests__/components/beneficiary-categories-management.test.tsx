import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import {
  createBeneficiaryCategory,
  deleteBeneficiaryCategory,
  editBeneficiaryCategory,
} from '@/app/actions/beneficiary-categories';
import { BeneficiaryCategoriesManagement } from '@/components/beneficiary-categories/beneficiary-categories-management';

vi.mock('@/app/actions/beneficiary-categories', () => ({
  createBeneficiaryCategory: vi.fn(),
  deleteBeneficiaryCategory: vi.fn(),
  editBeneficiaryCategory: vi.fn(),
}));

const CATEGORIES = [
  { id: 3, name: 'Familias', isSystem: true, projectCount: 4 },
  { id: 9, name: 'Docentes', isSystem: false, projectCount: 0 },
  { id: 12, name: 'Jóvenes', isSystem: false, projectCount: 2 },
];

const EMPTY_NAME_ERROR = 'Ingresá un nombre para la categoría';

function row(name: string) {
  return within(screen.getByText(name).closest('li')!);
}

function nameInput() {
  return screen.getByPlaceholderText('Nueva categoría...') as HTMLInputElement;
}

async function clickButton(button: HTMLElement) {
  await act(async () => {
    fireEvent.click(button);
  });
}

async function openEditDialog(name: string) {
  await clickButton(row(name).getByRole('button', { name: 'Editar' }));
  return within(await screen.findByRole('alertdialog'));
}

async function openDeleteDialog(name: string) {
  await clickButton(row(name).getByRole('button', { name: 'Eliminar' }));
  return within(await screen.findByRole('alertdialog'));
}

beforeEach(() => {
  vi.mocked(createBeneficiaryCategory).mockReset().mockResolvedValue({ success: true });
  vi.mocked(editBeneficiaryCategory).mockReset().mockResolvedValue({ success: true });
  vi.mocked(deleteBeneficiaryCategory).mockReset().mockResolvedValue({});
});

it('links beneficiary categories with projects to the filtered projects page', () => {
  render(<BeneficiaryCategoriesManagement categories={CATEGORIES} />);

  const families = screen.getByText('Familias').closest('li');
  expect(families).not.toBeNull();
  expect(within(families!).getByRole('link', { name: '4 proyectos' }).getAttribute('href')).toBe(
    '/dashboard/projects?beneficiaryCategoryId=3&status=all&beneficiaryYear=all'
  );
});

it('keeps the project count as plain text when a beneficiary category has no projects', () => {
  render(<BeneficiaryCategoriesManagement categories={CATEGORIES} />);

  const teachers = screen.getByText('Docentes').closest('li');
  expect(teachers).not.toBeNull();
  expect(within(teachers!).queryByRole('link')).toBeNull();
  expect(within(teachers!).getByText('0 proyectos').tagName).toBe('SPAN');
});

it('counts the categories', () => {
  const { unmount } = render(<BeneficiaryCategoriesManagement categories={CATEGORIES} />);
  expect(screen.getByText('3 categorías')).toBeDefined();
  unmount();

  render(<BeneficiaryCategoriesManagement categories={[CATEGORIES[0]]} />);
  expect(screen.getByText('1 categoría')).toBeDefined();
});

it('blocks creating a category without a name', async () => {
  render(<BeneficiaryCategoriesManagement categories={CATEGORIES} />);

  await clickButton(screen.getByRole('button', { name: 'Agregar' }));

  expect(screen.getByText(EMPTY_NAME_ERROR)).toBeDefined();
  expect(createBeneficiaryCategory).not.toHaveBeenCalled();
});

it('creates a category and clears the input', async () => {
  render(<BeneficiaryCategoriesManagement categories={CATEGORIES} />);

  fireEvent.change(nameInput(), { target: { value: 'Adultos' } });
  await clickButton(screen.getByRole('button', { name: 'Agregar' }));

  await waitFor(() => expect(createBeneficiaryCategory).toHaveBeenCalledOnce());
  const formData = vi.mocked(createBeneficiaryCategory).mock.calls[0][1];
  expect(formData.get('name')).toBe('Adultos');
  await waitFor(() => expect(nameInput().value).toBe(''));
});

it('shows the errors returned when creating a category', async () => {
  vi.mocked(createBeneficiaryCategory).mockResolvedValue({
    errors: { name: ['Ya existe esa categoría'] },
    formError: 'No se pudo guardar',
  });
  render(<BeneficiaryCategoriesManagement categories={CATEGORIES} />);

  fireEvent.change(nameInput(), { target: { value: 'Docentes' } });
  await clickButton(screen.getByRole('button', { name: 'Agregar' }));

  expect(await screen.findByText('Ya existe esa categoría')).toBeDefined();
  expect(screen.getByText('No se pudo guardar')).toBeDefined();
  expect(nameInput().value).toBe('Docentes');
});

it('blocks saving an edited category without a name', async () => {
  render(<BeneficiaryCategoriesManagement categories={CATEGORIES} />);

  const dialog = await openEditDialog('Docentes');
  const input = dialog.getByRole('textbox') as HTMLInputElement;
  expect(input.value).toBe('Docentes');

  fireEvent.change(input, { target: { value: ' ' } });
  await clickButton(dialog.getByRole('button', { name: 'Guardar' }));

  expect(dialog.getByText(EMPTY_NAME_ERROR)).toBeDefined();
  expect(editBeneficiaryCategory).not.toHaveBeenCalled();
});

it('saves an edited category and closes the dialog', async () => {
  render(<BeneficiaryCategoriesManagement categories={CATEGORIES} />);

  const dialog = await openEditDialog('Docentes');
  fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'Educadores' } });
  await clickButton(dialog.getByRole('button', { name: 'Guardar' }));

  await waitFor(() => expect(editBeneficiaryCategory).toHaveBeenCalledOnce());
  const [id, , formData] = vi.mocked(editBeneficiaryCategory).mock.calls[0];
  expect(id).toBe(9);
  expect(formData.get('name')).toBe('Educadores');
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
});

it('keeps the edit dialog open with the returned error', async () => {
  vi.mocked(editBeneficiaryCategory).mockResolvedValue({ formError: 'No se pudo editar' });
  render(<BeneficiaryCategoriesManagement categories={CATEGORIES} />);

  const dialog = await openEditDialog('Docentes');
  await clickButton(dialog.getByRole('button', { name: 'Guardar' }));

  expect(await dialog.findByText('No se pudo editar')).toBeDefined();
  expect(screen.getByRole('alertdialog')).toBeDefined();
});

it('marks system categories and does not offer to delete them', () => {
  render(<BeneficiaryCategoriesManagement categories={CATEGORIES} />);

  expect(row('Familias').getByText('Sistema')).toBeDefined();
  expect(row('Familias').queryByRole('button', { name: 'Eliminar' })).toBeNull();
});

it('explains that a category with projects cannot be deleted', async () => {
  render(<BeneficiaryCategoriesManagement categories={CATEGORIES} />);

  const dialog = await openDeleteDialog('Jóvenes');

  expect(dialog.getByText('No se puede eliminar la categoría')).toBeDefined();
  expect(dialog.queryByRole('button', { name: 'Eliminar' })).toBeNull();
});

it('deletes a category without projects after confirming', async () => {
  render(<BeneficiaryCategoriesManagement categories={CATEGORIES} />);

  const dialog = await openDeleteDialog('Docentes');
  expect(dialog.getByText(/Docentes/)).toBeDefined();

  await clickButton(dialog.getByRole('button', { name: 'Eliminar' }));

  await waitFor(() => expect(deleteBeneficiaryCategory).toHaveBeenCalledOnce());
  expect(vi.mocked(deleteBeneficiaryCategory).mock.calls[0][0]).toBe(9);
});

it('shows the error returned when deleting a category', async () => {
  vi.mocked(deleteBeneficiaryCategory).mockResolvedValue({ formError: 'No se pudo eliminar' });
  render(<BeneficiaryCategoriesManagement categories={CATEGORIES} />);

  const dialog = await openDeleteDialog('Docentes');
  await clickButton(dialog.getByRole('button', { name: 'Eliminar' }));

  expect(await dialog.findByText('No se pudo eliminar')).toBeDefined();
});
