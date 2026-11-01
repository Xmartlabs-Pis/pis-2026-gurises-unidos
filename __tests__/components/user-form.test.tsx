import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { UserForm } from '@/components/user-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/app/actions/users', () => ({
  createUser: vi.fn(async () => ({})),
  updateUser: vi.fn(async () => ({})),
  updateUserStatus: vi.fn(async () => ({})),
}));

vi.mock('@/app/actions/password', () => ({
  resetPassword: vi.fn(async () => ({})),
}));

const EDITED_USER = {
  id: 7,
  firstName: 'Ana',
  lastName: 'García',
  documentId: '77777777',
  email: 'ana@example.com',
  role: 'admin' as const,
  status: 'disabled' as const,
  information: {
    createdAt: '01/01/2026',
    lastAccess: '05/03/2026',
    createdBy: 'Mario Pérez',
    updatedAt: '18/09/2026',
  },
};

test('enables saving when editing a user', () => {
  render(<UserForm mode="edit" initialValues={EDITED_USER} />);

  const saveButton = screen.getByRole('button', { name: 'Guardar usuario' }) as HTMLButtonElement;

  expect(saveButton.disabled).toBe(false);
  expect(screen.queryByRole('button', { name: 'Guardar borrador' })).toBeNull();
});

test('prefills the user edit form and information', () => {
  render(<UserForm mode="edit" initialValues={EDITED_USER} />);

  expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Ana');
  expect((screen.getByLabelText('Apellido') as HTMLInputElement).value).toBe('García');
  expect((screen.getByLabelText('Documento (Cédula)') as HTMLInputElement).value).toBe('77777777');
  expect((screen.getByLabelText('Correo electrónico') as HTMLInputElement).value).toBe(
    'ana@example.com'
  );
  expect(screen.getByLabelText('Rol').textContent).toContain('Administrador');
  expect(screen.getByText('Deshabilitado')).toBeDefined();
  expect(screen.getByRole('button', { name: 'Habilitar usuario' })).toBeDefined();
  expect(screen.getByText('01/01/2026')).toBeDefined();
  expect(screen.getByText('05/03/2026')).toBeDefined();
  expect(screen.getByText('Mario Pérez')).toBeDefined();
  expect(screen.getByText('18/09/2026')).toBeDefined();
  expect(
    (screen.getByRole('button', { name: 'Restablecer contraseña' }) as HTMLButtonElement).disabled
  ).toBe(false);
});

test('locks the status of a user with a pending invitation', () => {
  render(<UserForm mode="edit" initialValues={{ ...EDITED_USER, status: 'pendingInvitation' }} />);

  expect(screen.getByText('Invitación pendiente')).toBeDefined();
  expect(screen.queryByRole('button', { name: 'Habilitar usuario' })).toBeNull();
  expect(screen.queryByRole('button', { name: 'Deshabilitar usuario' })).toBeNull();
});

test('hides the password reset for a user with a pending invitation', () => {
  render(<UserForm mode="edit" initialValues={{ ...EDITED_USER, status: 'pendingInvitation' }} />);

  expect(screen.queryByRole('button', { name: 'Restablecer contraseña' })).toBeNull();
  expect(screen.getByText(/elegirá su contraseña al aceptar la invitación/)).toBeDefined();
});

test('replaces the temporary password with an invitation notice when creating a user', () => {
  render(<UserForm />);

  expect(screen.queryByLabelText('Contraseña temporal')).toBeNull();
  expect(screen.getByText(/se enviará una invitación al correo ingresado/)).toBeDefined();
  expect(screen.getByRole('button', { name: 'Guardar y enviar invitación' })).toBeDefined();
});
