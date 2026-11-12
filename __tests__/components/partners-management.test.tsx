import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { PartnersManagement } from '@/components/partners/partners-management';
import { createPartner, deletePartner, editPartner } from '@/app/actions/partners';

vi.mock('@/app/actions/partners', () => ({
  createPartner: vi.fn(),
  deletePartner: vi.fn(),
  editPartner: vi.fn(),
}));

const PARTNERS = [
  { id: 5, name: 'INAU', counterpartyType: 'publicSector' as const, _count: { projects: 3 } },
  { id: 8, name: 'BASF', counterpartyType: 'privateSector' as const, _count: { projects: 0 } },
];

const EMPTY_NAME_ERROR = 'Ingresá un nombre para el socio';

function row(name: string) {
  return within(screen.getByText(name).closest('li')!);
}

function nameInput() {
  return screen.getByRole('textbox', { name: 'Nombre del socio' }) as HTMLInputElement;
}

async function clickButton(button: HTMLElement) {
  await act(async () => {
    fireEvent.click(button);
  });
}

async function chooseCounterpartyType(
  label: string,
  scope: Pick<typeof screen, 'getByRole'> = screen
) {
  fireEvent.click(scope.getByRole('combobox', { name: 'Tipo de contraparte' }));
  fireEvent.keyDown(await screen.findByRole('option', { name: label }), { key: 'Enter' });
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
  vi.mocked(createPartner).mockReset().mockResolvedValue({ success: true });
  vi.mocked(editPartner).mockReset().mockResolvedValue({ success: true });
  vi.mocked(deletePartner).mockReset().mockResolvedValue({});
});

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

it('creates a partner and clears the input', async () => {
  render(<PartnersManagement partners={[]} />);

  fireEvent.change(nameInput(), { target: { value: 'ANEP' } });
  await chooseCounterpartyType('Sector Público');
  await clickButton(screen.getByRole('button', { name: 'Agregar' }));

  await waitFor(() => expect(createPartner).toHaveBeenCalledOnce());
  const formData = vi.mocked(createPartner).mock.calls[0][1];
  expect(formData.get('name')).toBe('ANEP');
  expect(formData.get('counterpartyType')).toBe('publicSector');
  await waitFor(() => expect(nameInput().value).toBe(''));
  expect(screen.getByRole('combobox', { name: 'Tipo de contraparte' }).textContent).not.toContain(
    'Sector Público'
  );
});

it('shows the errors returned when creating a partner', async () => {
  vi.mocked(createPartner).mockResolvedValue({
    errors: { name: ['Ya existe ese socio'] },
    formError: 'No se pudo guardar',
  });
  render(<PartnersManagement partners={[]} />);

  fireEvent.change(nameInput(), { target: { value: 'INAU' } });
  await chooseCounterpartyType('Sector Público');
  await clickButton(screen.getByRole('button', { name: 'Agregar' }));

  expect(await screen.findByText('Ya existe ese socio')).toBeDefined();
  expect(screen.getByText('No se pudo guardar')).toBeDefined();
  expect(nameInput().value).toBe('INAU');
});

it('blocks saving an edited partner without a name', async () => {
  render(<PartnersManagement partners={PARTNERS} />);

  const dialog = await openEditDialog('BASF');
  const input = dialog.getByRole('textbox', { name: 'Nombre del socio' }) as HTMLInputElement;
  expect(input.value).toBe('BASF');

  fireEvent.change(input, { target: { value: ' ' } });
  await clickButton(dialog.getByRole('button', { name: 'Guardar' }));

  expect(dialog.getByText(EMPTY_NAME_ERROR)).toBeDefined();
  expect(editPartner).not.toHaveBeenCalled();
});

it('saves an edited partner and closes the dialog', async () => {
  render(<PartnersManagement partners={PARTNERS} />);

  const dialog = await openEditDialog('BASF');
  fireEvent.change(dialog.getByRole('textbox', { name: 'Nombre del socio' }), {
    target: { value: 'ANEP' },
  });
  await chooseCounterpartyType('Sector Público', dialog);
  await clickButton(dialog.getByRole('button', { name: 'Guardar' }));

  await waitFor(() => expect(editPartner).toHaveBeenCalledOnce());
  const [id, , formData] = vi.mocked(editPartner).mock.calls[0];
  expect(id).toBe(8);
  expect(formData.get('name')).toBe('ANEP');
  expect(formData.get('counterpartyType')).toBe('publicSector');
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
});

it('keeps the edit dialog open with the returned error', async () => {
  vi.mocked(editPartner).mockResolvedValue({ formError: 'No se pudo editar' });
  render(<PartnersManagement partners={PARTNERS} />);

  const dialog = await openEditDialog('BASF');
  await clickButton(dialog.getByRole('button', { name: 'Guardar' }));

  expect(await dialog.findByText('No se pudo editar')).toBeDefined();
  expect(screen.getByRole('alertdialog')).toBeDefined();
});

it('discards an unsaved edit when reopening the dialog', async () => {
  render(<PartnersManagement partners={PARTNERS} />);

  const dialog = await openEditDialog('BASF');
  fireEvent.change(dialog.getByRole('textbox', { name: 'Nombre del socio' }), {
    target: { value: 'Otro nombre' },
  });
  await chooseCounterpartyType('Cooperación Internacional', dialog);
  await clickButton(dialog.getByRole('button', { name: 'Cancelar' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

  const reopened = await openEditDialog('BASF');

  expect(
    (reopened.getByRole('textbox', { name: 'Nombre del socio' }) as HTMLInputElement).value
  ).toBe('BASF');
  expect(reopened.getByRole('combobox', { name: 'Tipo de contraparte' }).textContent).toContain(
    'Sector Privado'
  );
});

it('explains that a partner with projects cannot be deleted', async () => {
  render(<PartnersManagement partners={PARTNERS} />);

  const dialog = await openDeleteDialog('INAU');

  expect(dialog.getByText('No se puede eliminar el socio')).toBeDefined();
  expect(dialog.queryByRole('button', { name: 'Eliminar' })).toBeNull();
  expect(deletePartner).not.toHaveBeenCalled();
});

it('deletes a partner without projects after confirming', async () => {
  render(<PartnersManagement partners={PARTNERS} />);

  const dialog = await openDeleteDialog('BASF');
  expect(dialog.getByText(/BASF/)).toBeDefined();

  await clickButton(dialog.getByRole('button', { name: 'Eliminar' }));

  await waitFor(() => expect(deletePartner).toHaveBeenCalledOnce());
  expect(vi.mocked(deletePartner).mock.calls[0][0]).toBe(8);
});

it('shows the error returned when deleting a partner', async () => {
  vi.mocked(deletePartner).mockResolvedValue({ formError: 'No se pudo eliminar' });
  render(<PartnersManagement partners={PARTNERS} />);

  const dialog = await openDeleteDialog('BASF');
  await clickButton(dialog.getByRole('button', { name: 'Eliminar' }));

  expect(await dialog.findByText('No se pudo eliminar')).toBeDefined();
});
