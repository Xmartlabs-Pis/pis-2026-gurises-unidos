import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { UsersTable } from '@/components/users/users-table';
import type { User } from '@/lib/users/format';

const { updateUserStatusMock, deleteUserMock, notifySuccessMock } = vi.hoisted(() => ({
  updateUserStatusMock: vi.fn(),
  deleteUserMock: vi.fn(),
  notifySuccessMock: vi.fn(),
}));

vi.mock('@/app/actions/users', () => ({
  updateUserStatus: updateUserStatusMock,
  deleteUser: deleteUserMock,
}));
vi.mock('@/app/actions/password', () => ({ resetPassword: vi.fn() }));
vi.mock('@/lib/notify', () => ({ notify: { success: notifySuccessMock } }));

const USER: User = {
  id: 42,
  firstName: 'Ana',
  lastName: 'García',
  email: 'ana@example.com',
  role: 'coordinator',
  status: 'active',
  lastAccess: null,
};

const CURRENT_USER_ID = 7;

function openActionsMenu() {
  fireEvent.click(screen.getAllByRole('button', { name: 'Acciones para Ana García' })[0]);
}

function openStatusDialog(action: 'Deshabilitar' | 'Habilitar') {
  openActionsMenu();
  fireEvent.click(screen.getByRole('menuitem', { name: action }));
}

function openDeleteDialog() {
  openActionsMenu();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Eliminar' }));
}

beforeEach(() => {
  updateUserStatusMock.mockReset();
  deleteUserMock.mockReset();
  notifySuccessMock.mockReset();
});

test('links the edit action to the selected user', () => {
  render(<UsersTable users={[USER]} currentUserId={CURRENT_USER_ID} />);

  openActionsMenu();

  expect(screen.getByRole('menuitem', { name: 'Editar' }).getAttribute('href')).toBe(
    '/management/users/42/edit'
  );
});

test('hides the status action on the current user row', () => {
  render(<UsersTable users={[USER]} currentUserId={USER.id} />);

  openActionsMenu();

  expect(screen.queryByRole('menuitem', { name: 'Deshabilitar' })).toBeNull();
});

test('hides the status action for users with a pending invitation', () => {
  render(
    <UsersTable
      users={[{ ...USER, status: 'pendingInvitation' }]}
      currentUserId={CURRENT_USER_ID}
    />
  );

  openActionsMenu();

  expect(screen.queryByRole('menuitem', { name: 'Deshabilitar' })).toBeNull();
  expect(screen.queryByRole('menuitem', { name: 'Habilitar' })).toBeNull();
});

test('asks for confirmation before disabling a user', async () => {
  render(<UsersTable users={[USER]} currentUserId={CURRENT_USER_ID} />);

  openStatusDialog('Deshabilitar');

  expect(await screen.findByRole('alertdialog')).toBeTruthy();
  expect(screen.getByText('¿Deshabilitar a Ana García?')).toBeTruthy();
  expect(updateUserStatusMock).not.toHaveBeenCalled();
});

test('disables the user, confirms with a toast and closes the dialog', async () => {
  updateUserStatusMock.mockResolvedValue({ success: true });
  render(<UsersTable users={[USER]} currentUserId={CURRENT_USER_ID} />);

  openStatusDialog('Deshabilitar');
  fireEvent.click(await screen.findByRole('button', { name: 'Deshabilitar' }));

  expect(updateUserStatusMock).toHaveBeenCalledWith(42, 'disabled');
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  expect(notifySuccessMock).toHaveBeenCalledWith({ title: 'Se deshabilitó a Ana García' });
});

test('enables a disabled user', async () => {
  updateUserStatusMock.mockResolvedValue({ success: true });
  render(<UsersTable users={[{ ...USER, status: 'disabled' }]} currentUserId={CURRENT_USER_ID} />);

  openStatusDialog('Habilitar');
  expect(await screen.findByText('¿Habilitar a Ana García?')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Habilitar' }));

  expect(updateUserStatusMock).toHaveBeenCalledWith(42, 'active');
  await waitFor(() =>
    expect(notifySuccessMock).toHaveBeenCalledWith({ title: 'Se habilitó a Ana García' })
  );
});

test('keeps the dialog open and shows the error when the change fails', async () => {
  updateUserStatusMock.mockResolvedValue({
    error: 'No se puede deshabilitar al último administrador activo.',
  });
  render(<UsersTable users={[USER]} currentUserId={CURRENT_USER_ID} />);

  openStatusDialog('Deshabilitar');
  fireEvent.click(await screen.findByRole('button', { name: 'Deshabilitar' }));

  expect((await screen.findByRole('alert')).textContent).toBe(
    'No se puede deshabilitar al último administrador activo.'
  );
  expect(screen.getByRole('alertdialog')).toBeTruthy();
  expect(notifySuccessMock).not.toHaveBeenCalled();
});

test('opens the reset password dialog from the actions menu', async () => {
  render(<UsersTable users={[USER]} currentUserId={CURRENT_USER_ID} />);

  openActionsMenu();
  fireEvent.click(screen.getByRole('menuitem', { name: 'Restablecer contraseña' }));

  expect(await screen.findByText('¿Restablecer la contraseña de Ana García?')).toBeTruthy();
  expect(
    ((await screen.findByLabelText('Contraseña temporal')) as HTMLInputElement).value
  ).not.toBe('');
});

test('hides the reset password action on the current user row', () => {
  render(<UsersTable users={[USER]} currentUserId={USER.id} />);

  openActionsMenu();

  expect(screen.getByRole('menuitem', { name: 'Editar' })).toBeTruthy();
  expect(screen.queryByRole('menuitem', { name: 'Restablecer contraseña' })).toBeNull();
});

test('hides the delete action on the current user row', () => {
  render(<UsersTable users={[USER]} currentUserId={USER.id} />);

  openActionsMenu();

  expect(screen.queryByRole('menuitem', { name: 'Eliminar' })).toBeNull();
});

test('asks for confirmation before deleting a user', async () => {
  render(<UsersTable users={[USER]} currentUserId={CURRENT_USER_ID} />);

  openDeleteDialog();

  expect(await screen.findByRole('alertdialog')).toBeTruthy();
  expect(screen.getByText('¿Eliminar a Ana García?')).toBeTruthy();
  expect(
    screen.getByText(
      'Va a perder el acceso al sistema. Los proyectos que tiene asignados se mantienen.'
    )
  ).toBeTruthy();
  expect(deleteUserMock).not.toHaveBeenCalled();
});

test('deletes the user, confirms with a toast and closes the dialog', async () => {
  deleteUserMock.mockResolvedValue({ success: true });
  render(<UsersTable users={[USER]} currentUserId={CURRENT_USER_ID} />);

  openDeleteDialog();
  fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));

  expect(deleteUserMock).toHaveBeenCalledWith(42);
  await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
  expect(notifySuccessMock).toHaveBeenCalledWith({ title: 'Se eliminó a Ana García' });
});

test('keeps the dialog open and shows the error when deletion fails', async () => {
  deleteUserMock.mockResolvedValue({
    error: 'No se puede dar de baja al último administrador activo.',
  });
  render(<UsersTable users={[USER]} currentUserId={CURRENT_USER_ID} />);

  openDeleteDialog();
  fireEvent.click(await screen.findByRole('button', { name: 'Eliminar' }));

  expect((await screen.findByRole('alert')).textContent).toBe(
    'No se puede dar de baja al último administrador activo.'
  );
  expect(screen.getByRole('alertdialog')).toBeTruthy();
  expect(notifySuccessMock).not.toHaveBeenCalled();
});
