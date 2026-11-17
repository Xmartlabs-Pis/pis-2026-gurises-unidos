import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import {
  createStrategicLine,
  deleteStrategicLine,
  editStrategicLine,
} from '@/app/actions/strategic-lines';
import { StrategicLinesManagement } from '@/components/strategic-lines/strategic-lines-management';

vi.mock('@/app/actions/strategic-lines', () => ({
  createStrategicLine: vi.fn(),
  deleteStrategicLine: vi.fn(),
  editStrategicLine: vi.fn(),
}));

const LINES = [
  { id: 5, name: 'Formación', _count: { projects: 3 } },
  { id: 8, name: 'Atención Directa', _count: { projects: 0 } },
];

const EMPTY_NAME_ERROR = 'Ingresá un nombre para la línea estratégica';

function row(name: string) {
  return within(screen.getByText(name).closest('li')!);
}

function nameInput() {
  return screen.getByPlaceholderText('Nueva línea estratégica...') as HTMLInputElement;
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
  vi.mocked(createStrategicLine).mockReset().mockResolvedValue({ success: true });
  vi.mocked(editStrategicLine).mockReset().mockResolvedValue({ success: true });
  vi.mocked(deleteStrategicLine).mockReset().mockResolvedValue({});
});

it('links strategic lines with projects to the filtered projects page', () => {
  render(<StrategicLinesManagement lines={LINES} />);

  const training = screen.getByText('Formación').closest('li');
  expect(training).not.toBeNull();
  expect(within(training!).getByRole('link', { name: '3 proyectos' }).getAttribute('href')).toBe(
    '/dashboard/projects?strategicLineId=5&status=all&beneficiaryYear=all'
  );
});

it('keeps the project count as plain text when a strategic line has no projects', () => {
  render(<StrategicLinesManagement lines={LINES} />);

  const directCare = screen.getByText('Atención Directa').closest('li');
  expect(directCare).not.toBeNull();
  expect(within(directCare!).queryByRole('link')).toBeNull();
  expect(within(directCare!).getByText('0 proyectos').tagName).toBe('SPAN');
});

it('counts the strategic lines', () => {
  const { unmount } = render(<StrategicLinesManagement lines={LINES} />);
  expect(screen.getByText('2 líneas estratégicas')).toBeDefined();
  unmount();

  render(<StrategicLinesManagement lines={[LINES[0]]} />);
  expect(screen.getByText('1 línea estratégica')).toBeDefined();
});

it('blocks creating a strategic line without a name', async () => {
  render(<StrategicLinesManagement lines={LINES} />);

  await clickButton(screen.getByRole('button', { name: 'Agregar' }));

  expect(screen.getByText(EMPTY_NAME_ERROR)).toBeDefined();
  expect(createStrategicLine).not.toHaveBeenCalled();
});

it('creates a strategic line and clears the input', async () => {
  render(<StrategicLinesManagement lines={LINES} />);

  fireEvent.change(nameInput(), { target: { value: 'Incidencia' } });
  await clickButton(screen.getByRole('button', { name: 'Agregar' }));

  await waitFor(() => expect(createStrategicLine).toHaveBeenCalledOnce());
  const formData = vi.mocked(createStrategicLine).mock.calls[0][1];
  expect(formData.get('name')).toBe('Incidencia');
  await waitFor(() => expect(nameInput().value).toBe(''));
});

it('shows the errors returned when creating a strategic line', async () => {
  vi.mocked(createStrategicLine).mockResolvedValue({
    errors: { name: ['Ya existe esa línea'] },
    formError: 'No se pudo guardar',
  });
  render(<StrategicLinesManagement lines={LINES} />);

  fireEvent.change(nameInput(), { target: { value: 'Formación' } });
  await clickButton(screen.getByRole('button', { name: 'Agregar' }));

  expect(await screen.findByText('Ya existe esa línea')).toBeDefined();
  expect(screen.getByText('No se pudo guardar')).toBeDefined();
  expect(nameInput().value).toBe('Formación');
});

it('blocks saving an edited strategic line without a name', async () => {
  render(<StrategicLinesManagement lines={LINES} />);

  const dialog = await openEditDialog('Formación');
  const input = dialog.getByRole('textbox') as HTMLInputElement;
  expect(input.value).toBe('Formación');

  fireEvent.change(input, { target: { value: ' ' } });
  await clickButton(dialog.getByRole('button', { name: 'Guardar' }));

  expect(dialog.getByText(EMPTY_NAME_ERROR)).toBeDefined();
  expect(editStrategicLine).not.toHaveBeenCalled();
});

it('saves an edited strategic line and closes the dialog', async () => {
  render(<StrategicLinesManagement lines={LINES} />);

  const dialog = await openEditDialog('Formación');
  fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'Capacitación' } });
  await clickButton(dialog.getByRole('button', { name: 'Guardar' }));

  await waitFor(() => expect(editStrategicLine).toHaveBeenCalledOnce());
  const [id, , formData] = vi.mocked(editStrategicLine).mock.calls[0];
  expect(id).toBe(5);
  expect(formData.get('name')).toBe('Capacitación');
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
});

it('keeps the edit dialog open with the returned error', async () => {
  vi.mocked(editStrategicLine).mockResolvedValue({ formError: 'No se pudo editar' });
  render(<StrategicLinesManagement lines={LINES} />);

  const dialog = await openEditDialog('Formación');
  await clickButton(dialog.getByRole('button', { name: 'Guardar' }));

  expect(await dialog.findByText('No se pudo editar')).toBeDefined();
  expect(screen.getByRole('alertdialog')).toBeDefined();
});

it('discards an unsaved edit when reopening the dialog', async () => {
  render(<StrategicLinesManagement lines={LINES} />);

  const dialog = await openEditDialog('Formación');
  fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'Otro nombre' } });
  await clickButton(dialog.getByRole('button', { name: 'Cancelar' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

  const reopened = await openEditDialog('Formación');

  expect((reopened.getByRole('textbox') as HTMLInputElement).value).toBe('Formación');
});

it('explains that a strategic line with projects cannot be deleted', async () => {
  render(<StrategicLinesManagement lines={LINES} />);

  const dialog = await openDeleteDialog('Formación');

  expect(dialog.getByText('No se puede eliminar la línea estratégica')).toBeDefined();
  expect(dialog.queryByRole('button', { name: 'Eliminar' })).toBeNull();
});

it('deletes a strategic line without projects after confirming', async () => {
  render(<StrategicLinesManagement lines={LINES} />);

  const dialog = await openDeleteDialog('Atención Directa');
  expect(dialog.getByText(/Atención Directa/)).toBeDefined();

  await clickButton(dialog.getByRole('button', { name: 'Eliminar' }));

  await waitFor(() => expect(deleteStrategicLine).toHaveBeenCalledOnce());
  expect(vi.mocked(deleteStrategicLine).mock.calls[0][0]).toBe(8);
});

it('shows the error returned when deleting a strategic line', async () => {
  vi.mocked(deleteStrategicLine).mockResolvedValue({ formError: 'No se pudo eliminar' });
  render(<StrategicLinesManagement lines={LINES} />);

  const dialog = await openDeleteDialog('Atención Directa');
  await clickButton(dialog.getByRole('button', { name: 'Eliminar' }));

  expect(await dialog.findByText('No se pudo eliminar')).toBeDefined();
});
