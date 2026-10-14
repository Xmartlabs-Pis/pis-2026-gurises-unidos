import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { UserForm } from '@/components/user-form';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/app/actions/users', () => ({
  createUser: vi.fn(async () => ({})),
}));

vi.mock('@/app/actions/password', () => ({
  resetPassword: vi.fn(async () => ({})),
}));

test('enables save and hides the draft action when editing a user', () => {
  render(<UserForm mode="edit" />);

  const saveButton = screen.getByRole('button', {
    name: 'Guardar usuario',
  }) as HTMLButtonElement;

  expect(saveButton.disabled).toBe(false);
  expect(screen.queryByRole('button', { name: 'Guardar borrador' })).toBeNull();
});

test('prefills the user edit form and information', () => {
  render(
    <UserForm
      mode="edit"
      initialValues={{
        id: 7,
        firstName: 'Ana',
        lastName: 'García',
        documentId: '77777777',
        email: 'ana@example.com',
        role: 'admin',
        status: 'disabled',
        information: {
          createdAt: '01/01/2026',
          lastAccess: '05/03/2026',
          createdBy: 'Mario Pérez',
          updatedAt: '18/09/2026',
        },
      }}
    />
  );

  expect((screen.getByLabelText('Nombre') as HTMLInputElement).value).toBe('Ana');
  expect((screen.getByLabelText('Apellido') as HTMLInputElement).value).toBe('García');
  expect((screen.getByLabelText('Documento (Cédula)') as HTMLInputElement).value).toBe('77777777');
  expect((screen.getByLabelText('Correo electrónico') as HTMLInputElement).value).toBe(
    'ana@example.com'
  );
  expect(screen.getByLabelText('Rol').textContent).toContain('Administrador');
  expect(screen.getByRole('radio', { name: 'Deshabilitado' }).getAttribute('aria-checked')).toBe(
    'true'
  );
  expect(screen.getByText('01/01/2026')).toBeDefined();
  expect(screen.getByText('05/03/2026')).toBeDefined();
  expect(screen.getByText('Mario Pérez')).toBeDefined();
  expect(screen.getByText('18/09/2026')).toBeDefined();
  expect(
    (screen.getByRole('button', { name: 'Restablecer contraseña' }) as HTMLButtonElement).disabled
  ).toBe(false);
});
