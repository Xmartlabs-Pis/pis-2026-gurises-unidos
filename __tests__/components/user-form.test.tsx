import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createUser, updateUser } from '@/app/actions/users';
import { UserForm } from '@/components/user-form';
import { notify } from '@/lib/notify';
import { copyText } from '@/lib/clipboard';

const { routerMock } = vi.hoisted(() => ({ routerMock: { push: vi.fn() } }));

vi.mock('next/navigation', () => ({
  useRouter: () => routerMock,
}));

vi.mock('@/lib/clipboard', () => ({ copyText: vi.fn(async () => undefined) }));

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
    expect(formData.get('lastName')).toBe('García');
    expect(formData.get('documentId')).toBe('77777777');
    expect(formData.get('email')).toBe('ana@example.com');
    expect(formData.get('role')).toBe('coordinator');
    expect(updateUser).not.toHaveBeenCalled();
  });

  test('updates the edited user', async () => {
    render(<UserForm mode="edit" initialValues={EDITED_USER} />);

    await clickButton('Guardar usuario');

    await waitFor(() => expect(updateUser).toHaveBeenCalledOnce());
    const [id, , formData] = vi.mocked(updateUser).mock.calls[0];
    expect(id).toBe(7);
    expect(formData.get('firstName')).toBe('Ana');
    expect(formData.get('lastName')).toBe('García');
    expect(formData.get('documentId')).toBe('77777777');
    expect(formData.get('email')).toBe('ana@example.com');
    expect(formData.get('role')).toBe('admin');
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
    const dialog = within(await screen.findByRole('alertdialog'));

    await act(async () => {
      fireEvent.click(dialog.getByRole('button', { name: 'Cancelar' }));
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

    const dialog = within(await screen.findByRole('alertdialog'));
    expect(dialog.getByText('¿Deshabilitar a Ana García?')).toBeDefined();
  });
});

describe('creating a user with a temporary password', () => {
  const GENERATE_LABEL = 'Generar contraseña automáticamente';
  const PASSWORD_PATTERN = /^(?=.*[A-Z])(?=.*[a-z])(?=.*[0-9]).{8}$/;

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

  async function chooseMethod(label: string) {
    fireEvent.click(screen.getByLabelText('Método de creación'));
    await act(async () => {
      fireEvent.keyDown(await screen.findByRole('option', { name: label }), { key: 'Enter' });
    });
  }

  async function choosePasswordMethod() {
    await chooseMethod('Crear con contraseña temporal');
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
    vi.mocked(copyText).mockReset().mockResolvedValue(undefined);
    vi.mocked(createUser).mockReset().mockResolvedValue({});
  });

  test('defaults to the invitation method', () => {
    render(<UserForm />);

    expect(screen.getByLabelText('Método de creación').textContent).toContain(
      'Enviar invitación por correo'
    );
    expect(screen.queryByLabelText('Contraseña temporal')).toBeNull();
    expect(screen.queryByRole('button', { name: GENERATE_LABEL })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Copiar contraseña' })).toBeNull();
  });

  test('does not offer the creation method when editing a user', () => {
    render(<UserForm mode="edit" initialValues={EDITED_USER} />);

    expect(screen.queryByLabelText('Método de creación')).toBeNull();
    expect(screen.queryByLabelText('Contraseña temporal')).toBeNull();
  });

  test('shows the password controls and the matching copy once selected', async () => {
    render(<UserForm />);

    await choosePasswordMethod();

    expect(screen.getByLabelText('Contraseña temporal')).toBeDefined();
    expect(screen.getByRole('button', { name: GENERATE_LABEL })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Copiar contraseña' })).toBeDefined();
    expect(screen.getByText(/El administrador comparte esta contraseña/)).toBeDefined();
    expect(screen.queryByText(/se enviará una invitación al correo ingresado/)).toBeNull();
    expect(screen.getByRole('button', { name: 'Guardar usuario' })).toBeDefined();
    expect(screen.queryByRole('button', { name: 'Guardar y enviar invitación' })).toBeNull();
  });

  test('goes back to the invitation copy when switching the method back', async () => {
    render(<UserForm />);

    await choosePasswordMethod();
    await chooseMethod('Enviar invitación por correo');

    expect(screen.queryByLabelText('Contraseña temporal')).toBeNull();
    expect(screen.getByText(/se enviará una invitación al correo ingresado/)).toBeDefined();
    expect(screen.getByRole('button', { name: 'Guardar y enviar invitación' })).toBeDefined();
  });

  test('generates a temporary password that meets the requirements', async () => {
    render(<UserForm />);
    await choosePasswordMethod();

    await clickButton(GENERATE_LABEL);

    const input = screen.getByLabelText('Contraseña temporal') as HTMLInputElement;
    expect(input.value).toMatch(PASSWORD_PATTERN);
  });

  test('copies the password to the clipboard and confirms it', async () => {
    render(<UserForm />);
    await choosePasswordMethod();
    await clickButton(GENERATE_LABEL);
    const { value } = screen.getByLabelText('Contraseña temporal') as HTMLInputElement;

    await clickButton('Copiar contraseña');

    expect(copyText).toHaveBeenCalledExactlyOnceWith(value);
    expect(notify.success).toHaveBeenCalledWith({ title: 'Contraseña copiada al portapapeles' });
  });

  test('does nothing when copying an empty password', async () => {
    render(<UserForm />);
    await choosePasswordMethod();

    await clickButton('Copiar contraseña');

    expect(copyText).not.toHaveBeenCalled();
    expect(notify.success).not.toHaveBeenCalled();
  });

  test('notifies when the password cannot be copied', async () => {
    vi.mocked(copyText).mockRejectedValue(new Error('denied'));
    render(<UserForm />);
    await choosePasswordMethod();
    await clickButton(GENERATE_LABEL);

    await clickButton('Copiar contraseña');

    expect(notify.error).toHaveBeenCalledWith({ title: 'No se pudo copiar la contraseña' });
    expect(notify.success).not.toHaveBeenCalled();
  });

  test('requires a password before submitting', async () => {
    render(<UserForm />);
    await choosePasswordMethod();
    fillNewUser();

    await clickButton('Guardar usuario');

    expect(await screen.findByText('La contraseña es obligatoria.')).toBeDefined();
    expect(createUser).not.toHaveBeenCalled();
  });

  test('shows the first password rule that is not met', async () => {
    render(<UserForm />);
    await choosePasswordMethod();
    fillNewUser();
    fireEvent.change(screen.getByLabelText('Contraseña temporal'), {
      target: { value: 'password1' },
    });

    await clickButton('Guardar usuario');

    expect(
      await screen.findByText('La contraseña debe tener al menos una mayúscula.')
    ).toBeDefined();
    expect(createUser).not.toHaveBeenCalled();
  });

  test('submits the method and the typed password', async () => {
    render(<UserForm />);
    await choosePasswordMethod();
    fillNewUser();
    fireEvent.change(screen.getByLabelText('Contraseña temporal'), {
      target: { value: 'Temporary1' },
    });

    await clickButton('Guardar usuario');

    await waitFor(() => expect(createUser).toHaveBeenCalledOnce());
    const formData = vi.mocked(createUser).mock.calls[0][1];
    expect(formData.get('creationMethod')).toBe('password');
    expect(formData.get('password')).toBe('Temporary1');
    expect(formData.get('email')).toBe('ana@example.com');
  });

  test('submits a generated password', async () => {
    render(<UserForm />);
    await choosePasswordMethod();
    fillNewUser();
    await clickButton(GENERATE_LABEL);
    const { value } = screen.getByLabelText('Contraseña temporal') as HTMLInputElement;

    await clickButton('Guardar usuario');

    await waitFor(() => expect(createUser).toHaveBeenCalledOnce());
    expect(vi.mocked(createUser).mock.calls[0][1].get('password')).toBe(value);
  });

  test('submits an invitation without a password by default', async () => {
    render(<UserForm />);
    fillNewUser();

    await clickButton('Guardar y enviar invitación');

    await waitFor(() => expect(createUser).toHaveBeenCalledOnce());
    const formData = vi.mocked(createUser).mock.calls[0][1];
    expect(formData.get('creationMethod')).toBe('invitation');
    expect(formData.get('password')).toBeNull();
  });

  test('discards the typed password when switching back to the invitation', async () => {
    render(<UserForm />);
    await choosePasswordMethod();
    fillNewUser();
    fireEvent.change(screen.getByLabelText('Contraseña temporal'), {
      target: { value: 'Temporary1' },
    });
    await chooseMethod('Enviar invitación por correo');
    await choosePasswordMethod();

    expect((screen.getByLabelText('Contraseña temporal') as HTMLInputElement).value).toBe('');
  });

  test('describes the password consequences in the restore dialog', async () => {
    vi.mocked(createUser).mockResolvedValueOnce({ restoreConfirmationRequired: true });
    render(<UserForm />);
    await choosePasswordMethod();
    fillNewUser();
    fireEvent.change(screen.getByLabelText('Contraseña temporal'), {
      target: { value: 'Temporary1' },
    });

    await clickButton('Guardar usuario');

    const dialog = within(await screen.findByRole('alertdialog'));
    expect(dialog.getByText(/deberá cambiarla al ingresar/)).toBeDefined();
    expect(dialog.queryByText(/Se le envía una invitación/)).toBeNull();
  });

  test('resubmits the password when confirming the restore', async () => {
    vi.mocked(createUser).mockResolvedValueOnce({ restoreConfirmationRequired: true });
    render(<UserForm />);
    await choosePasswordMethod();
    fillNewUser();
    fireEvent.change(screen.getByLabelText('Contraseña temporal'), {
      target: { value: 'Temporary1' },
    });
    await clickButton('Guardar usuario');
    await screen.findByRole('alertdialog');

    await clickButton('Continuar');

    await waitFor(() => expect(createUser).toHaveBeenCalledTimes(2));
    const formData = vi.mocked(createUser).mock.calls[1][1];
    expect(formData.get('confirmRestore')).toBe('true');
    expect(formData.get('creationMethod')).toBe('password');
    expect(formData.get('password')).toBe('Temporary1');
  });

  test('describes the invitation in the restore dialog by default', async () => {
    vi.mocked(createUser).mockResolvedValueOnce({ restoreConfirmationRequired: true });
    render(<UserForm />);
    fillNewUser();

    await clickButton('Guardar y enviar invitación');

    const dialog = within(await screen.findByRole('alertdialog'));
    expect(dialog.getByText(/Se le envía una invitación/)).toBeDefined();
  });
});
