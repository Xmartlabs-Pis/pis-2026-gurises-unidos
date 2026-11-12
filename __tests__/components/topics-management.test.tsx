import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { createTopic, deleteTopic, editTopic } from '@/app/actions/topics';
import { TopicsManagement } from '@/components/topics/topics-management';

vi.mock('@/app/actions/topics', () => ({
  createTopic: vi.fn(),
  deleteTopic: vi.fn(),
  editTopic: vi.fn(),
}));

const TOPICS = [
  { id: 4, name: 'Salud', _count: { projects: 3 } },
  { id: 9, name: 'Cultura', _count: { projects: 0 } },
];

const EMPTY_NAME_ERROR = 'Ingresá un nombre para la temática';

function row(name: string) {
  return within(screen.getByText(name).closest('li')!);
}

function nameInput() {
  return screen.getByPlaceholderText('Nueva temática...') as HTMLInputElement;
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
  vi.mocked(createTopic).mockReset().mockResolvedValue({ success: true });
  vi.mocked(editTopic).mockReset().mockResolvedValue({ success: true });
  vi.mocked(deleteTopic).mockReset().mockResolvedValue({});
});

it('links topics with projects to the filtered projects page', () => {
  render(<TopicsManagement topics={TOPICS} />);

  const health = screen.getByText('Salud').closest('li');
  expect(health).not.toBeNull();
  expect(within(health!).getByRole('link', { name: '3 proyectos' }).getAttribute('href')).toBe(
    '/dashboard/projects?topicId=4&status=all&beneficiaryYear=all'
  );
});

it('keeps the project count as plain text when a topic has no projects', () => {
  render(<TopicsManagement topics={TOPICS} />);

  const culture = screen.getByText('Cultura').closest('li');
  expect(culture).not.toBeNull();
  expect(within(culture!).queryByRole('link')).toBeNull();
  expect(within(culture!).getByText('0 proyectos').tagName).toBe('SPAN');
});

it('blocks creating a topic without a name', async () => {
  render(<TopicsManagement topics={TOPICS} />);

  await clickButton(screen.getByRole('button', { name: 'Agregar' }));

  expect(screen.getByText(EMPTY_NAME_ERROR)).toBeDefined();
  expect(createTopic).not.toHaveBeenCalled();
});

it('creates a topic and clears the input', async () => {
  render(<TopicsManagement topics={TOPICS} />);

  fireEvent.change(nameInput(), { target: { value: 'Vivienda' } });
  await clickButton(screen.getByRole('button', { name: 'Agregar' }));

  await waitFor(() => expect(createTopic).toHaveBeenCalledOnce());
  const formData = vi.mocked(createTopic).mock.calls[0][1];
  expect(formData.get('name')).toBe('Vivienda');
  await waitFor(() => expect(nameInput().value).toBe(''));
});

it('shows the errors returned when creating a topic', async () => {
  vi.mocked(createTopic).mockResolvedValue({
    errors: { name: ['Ya existe esa temática'] },
    formError: 'No se pudo guardar',
  });
  render(<TopicsManagement topics={TOPICS} />);

  fireEvent.change(nameInput(), { target: { value: 'Salud' } });
  await clickButton(screen.getByRole('button', { name: 'Agregar' }));

  expect(await screen.findByText('Ya existe esa temática')).toBeDefined();
  expect(screen.getByText('No se pudo guardar')).toBeDefined();
  expect(nameInput().value).toBe('Salud');
});

it('blocks saving an edited topic without a name', async () => {
  render(<TopicsManagement topics={TOPICS} />);

  const dialog = await openEditDialog('Salud');
  const input = dialog.getByRole('textbox') as HTMLInputElement;
  expect(input.value).toBe('Salud');

  fireEvent.change(input, { target: { value: ' ' } });
  await clickButton(dialog.getByRole('button', { name: 'Guardar' }));

  expect(dialog.getByText(EMPTY_NAME_ERROR)).toBeDefined();
  expect(editTopic).not.toHaveBeenCalled();
});

it('saves an edited topic and closes the dialog', async () => {
  render(<TopicsManagement topics={TOPICS} />);

  const dialog = await openEditDialog('Salud');
  fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'Sanidad' } });
  await clickButton(dialog.getByRole('button', { name: 'Guardar' }));

  await waitFor(() => expect(editTopic).toHaveBeenCalledOnce());
  const [id, , formData] = vi.mocked(editTopic).mock.calls[0];
  expect(id).toBe(4);
  expect(formData.get('name')).toBe('Sanidad');
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
});

it('keeps the edit dialog open with the returned error', async () => {
  vi.mocked(editTopic).mockResolvedValue({ formError: 'No se pudo editar' });
  render(<TopicsManagement topics={TOPICS} />);

  const dialog = await openEditDialog('Salud');
  await clickButton(dialog.getByRole('button', { name: 'Guardar' }));

  expect(await dialog.findByText('No se pudo editar')).toBeDefined();
  expect(screen.getByRole('alertdialog')).toBeDefined();
});

it('discards an unsaved edit when reopening the dialog', async () => {
  render(<TopicsManagement topics={TOPICS} />);

  const dialog = await openEditDialog('Salud');
  fireEvent.change(dialog.getByRole('textbox'), { target: { value: 'Otro nombre' } });
  await clickButton(dialog.getByRole('button', { name: 'Cancelar' }));
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());

  const reopened = await openEditDialog('Salud');

  expect((reopened.getByRole('textbox') as HTMLInputElement).value).toBe('Salud');
});

it('explains that a topic with projects cannot be deleted', async () => {
  render(<TopicsManagement topics={TOPICS} />);

  const dialog = await openDeleteDialog('Salud');

  expect(dialog.getByText('No se puede eliminar la temática')).toBeDefined();
  expect(dialog.queryByRole('button', { name: 'Eliminar' })).toBeNull();
});

it('deletes a topic without projects after confirming', async () => {
  render(<TopicsManagement topics={TOPICS} />);

  const dialog = await openDeleteDialog('Cultura');
  expect(dialog.getByText(/Cultura/)).toBeDefined();

  await clickButton(dialog.getByRole('button', { name: 'Eliminar' }));

  await waitFor(() => expect(deleteTopic).toHaveBeenCalledOnce());
  expect(vi.mocked(deleteTopic).mock.calls[0][0]).toBe(9);
});

it('shows the error returned when deleting a topic', async () => {
  vi.mocked(deleteTopic).mockResolvedValue({ formError: 'No se pudo eliminar' });
  render(<TopicsManagement topics={TOPICS} />);

  const dialog = await openDeleteDialog('Cultura');
  await clickButton(dialog.getByRole('button', { name: 'Eliminar' }));

  expect(await dialog.findByText('No se pudo eliminar')).toBeDefined();
});
