import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createUser, updateUser } from '@/app/actions/users';
import { UserForm } from '@/components/user-form';
import { notify } from '@/lib/notify';

const { routerMock } = vi.hoisted(() => ({ routerMock: { push: vi.fn() } }));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

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

describe('submitting the form', () => {
  const CREATE_LABEL = 'Guardar y enviar invitación';

  function fillNewUser() {
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: 'Ana' } });
    fireEvent.change(screen.getByLabelText('Apellido'), { target: { value: 'García' } });
    fireEvent.change(screen.getByLabelText('Documento (Cédula)'), {
      target: { value: '77777777' },
    });
    fireEvent.change(screen.getByLabelText('Correo electrónico'), {
      target: { value: 'ana@example.com' },
    });
  }

  async function clickButton(name: string) {
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name }));
    });
  }

  beforeEach(() => {
    routerMock.push.mockReset();
    vi.mocked(notify.success).mockReset();
    vi.mocked(notify.error).mockReset();
    vi.mocked(createUser).mockReset().mockResolvedValue({});
    vi.mocked(updateUser).mockReset().mockResolvedValue({});
  });

  test('blocks submission and displays the validation errors', async () => {
    render(<UserForm />);

    await clickButton(CREATE_LABEL);

    expect(await screen.findByText('El nombre es obligatorio.')).toBeDefined();
    expect(screen.getByText('El apellido es obligatorio.')).toBeDefined();
    expect(screen.getByText('El documento es obligatorio.')).toBeDefined();
    expect(createUser).not.toHaveBeenCalled();
  });

  test('creates a user with the entered values', async () => {
    render(<UserForm />);

    fillNewUser();
    await clickButton(CREATE_LABEL);

    await waitFor(() => expect(createUser).toHaveBeenCalledOnce());
    const formData = vi.mocked(createUser).mock.calls[0][1];
    expect(formData.get('firstName')).toBe('Ana');
    expect(formData.get('documentId')).toBe('77777777');
    expect(formData.get('email')).toBe('ana@example.com');
    expect(updateUser).not.toHaveBeenCalled();
  });

  test('updates the edited user', async () => {
    render(<UserForm mode="edit" initialValues={EDITED_USER} />);

    await clickButton('Guardar usuario');

    await waitFor(() => expect(updateUser).toHaveBeenCalledOnce());
    expect(vi.mocked(updateUser).mock.calls[0][0]).toBe(7);
    expect(createUser).not.toHaveBeenCalled();
  });

  test('notifies a form error returned by the action', async () => {
    vi.mocked(createUser).mockResolvedValue({ formError: 'No se pudo guardar' });
    render(<UserForm />);

    fillNewUser();
    await clickButton(CREATE_LABEL);

    await waitFor(() =>
      expect(notify.error).toHaveBeenCalledExactlyOnceWith({ title: 'No se pudo guardar' })
    );
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  test('returns to the users list after restoring an account', async () => {
    vi.mocked(createUser).mockResolvedValue({ restored: true });
    render(<UserForm />);

    fillNewUser();
    await clickButton(CREATE_LABEL);

    await waitFor(() => expect(routerMock.push).toHaveBeenCalledWith('/management/users'));
    expect(notify.success).toHaveBeenCalledOnce();
  });

  test('resubmits with the restore confirmation when continuing', async () => {
    vi.mocked(createUser).mockResolvedValueOnce({ restoreConfirmationRequired: true });
    render(<UserForm />);

    fillNewUser();
    await clickButton(CREATE_LABEL);
    expect(await screen.findByRole('alertdialog')).toBeDefined();

    await clickButton('Continuar');

    await waitFor(() => expect(createUser).toHaveBeenCalledTimes(2));
    const formData = vi.mocked(createUser).mock.calls[1][1];
    expect(formData.get('confirmRestore')).toBe('true');
    expect(formData.get('documentId')).toBe('77777777');
  });

  test('does not resubmit when cancelling the restore', async () => {
    vi.mocked(createUser).mockResolvedValueOnce({ restoreConfirmationRequired: true });
    render(<UserForm />);

    fillNewUser();
    await clickButton(CREATE_LABEL);
    expect(await screen.findByRole('alertdialog')).toBeDefined();

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'Cancelar' }).at(-1)!);
    });

    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(createUser).toHaveBeenCalledOnce();
  });

  test('returns to the users list when cancelling the form', async () => {
    render(<UserForm />);

    await clickButton('Cancelar');

    expect(routerMock.push).toHaveBeenCalledExactlyOnceWith('/management/users');
  });

  test('opens the status dialog of the edited user', async () => {
    render(<UserForm mode="edit" initialValues={{ ...EDITED_USER, status: 'active' }} />);

    await clickButton('Deshabilitar usuario');

    expect(await screen.findByRole('alertdialog')).toBeDefined();
  });
});
