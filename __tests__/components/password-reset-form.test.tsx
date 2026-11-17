import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { completeForcedPasswordChangeMock, actionMock } = vi.hoisted(() => ({
  completeForcedPasswordChangeMock: vi.fn(),
  actionMock: vi.fn(),
}));

vi.mock('@/app/actions/password', () => ({
  completeForcedPasswordChange: completeForcedPasswordChangeMock,
}));

import { PasswordResetForm } from '@/components/password-reset-form';

const VALID_PASSWORD = 'Abcdefg1';

function newPasswordInput() {
  return screen.getByLabelText('Nueva contraseña') as HTMLInputElement;
}

function confirmPasswordInput() {
  return screen.getByLabelText('Confirmar nueva contraseña') as HTMLInputElement;
}

function fillForm(newPassword: string, confirmNewPassword: string) {
  fireEvent.change(newPasswordInput(), { target: { value: newPassword } });
  fireEvent.change(confirmPasswordInput(), { target: { value: confirmNewPassword } });
}

async function submitForm(label = 'Actualizar contraseña') {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: label }));
  });
}

beforeEach(() => {
  completeForcedPasswordChangeMock.mockReset().mockResolvedValue({});
  actionMock.mockReset().mockResolvedValue({});
});

describe('PasswordResetForm', () => {
  test('blocks submission and displays client validation errors', async () => {
    render(<PasswordResetForm action={actionMock} />);

    fillForm(VALID_PASSWORD, 'Abcdefg2');
    await submitForm();

    expect(await screen.findByText('Las contraseñas no coinciden')).toBeDefined();
    expect(actionMock).not.toHaveBeenCalled();
  });

  test('submits to the forced password change action by default', async () => {
    render(<PasswordResetForm />);

    fillForm(VALID_PASSWORD, VALID_PASSWORD);
    await submitForm();

    await waitFor(() => expect(completeForcedPasswordChangeMock).toHaveBeenCalledOnce());
    const formData = completeForcedPasswordChangeMock.mock.calls[0][1] as FormData;
    expect(formData.get('newPassword')).toBe(VALID_PASSWORD);
    expect(formData.get('confirmNewPassword')).toBe(VALID_PASSWORD);
    expect(formData.get('token')).toBeNull();
  });

  test('submits the token to the given action with a custom label', async () => {
    render(<PasswordResetForm action={actionMock} token="reset-token" submitLabel="Restablecer" />);

    fillForm(VALID_PASSWORD, VALID_PASSWORD);
    await submitForm('Restablecer');

    await waitFor(() => expect(actionMock).toHaveBeenCalledOnce());
    expect((actionMock.mock.calls[0][1] as FormData).get('token')).toBe('reset-token');
    expect(completeForcedPasswordChangeMock).not.toHaveBeenCalled();
  });

  test('displays a form error returned by the action', async () => {
    actionMock.mockResolvedValue({ formError: 'El enlace expiró.' });
    render(<PasswordResetForm action={actionMock} />);

    fillForm(VALID_PASSWORD, VALID_PASSWORD);
    await submitForm();

    expect((await screen.findByRole('alert')).textContent).toBe('El enlace expiró.');
  });

  test('displays field errors from the action and clears them when typing', async () => {
    actionMock.mockResolvedValue({
      errors: {
        newPassword: ['Contraseña rechazada'],
        confirmNewPassword: ['Confirmación rechazada'],
      },
    });
    render(<PasswordResetForm action={actionMock} />);

    fillForm(VALID_PASSWORD, VALID_PASSWORD);
    await submitForm();

    expect(await screen.findByText('Contraseña rechazada')).toBeDefined();
    expect(screen.getByText('Confirmación rechazada')).toBeDefined();

    fireEvent.change(newPasswordInput(), { target: { value: 'Abcdefg2' } });
    fireEvent.change(confirmPasswordInput(), { target: { value: 'Abcdefg2' } });

    await waitFor(() => {
      expect(screen.queryByText('Contraseña rechazada')).toBeNull();
      expect(screen.queryByText('Confirmación rechazada')).toBeNull();
    });
  });

  test('toggles the visibility of each password field', () => {
    render(<PasswordResetForm action={actionMock} />);
    const [newPasswordToggle, confirmPasswordToggle] = screen.getAllByRole('button', {
      name: 'Mostrar texto',
    });

    fireEvent.click(newPasswordToggle);
    expect(newPasswordInput().type).toBe('text');
    expect(confirmPasswordInput().type).toBe('password');

    fireEvent.click(confirmPasswordToggle);
    expect(confirmPasswordInput().type).toBe('text');

    fireEvent.click(newPasswordToggle);
    expect(newPasswordInput().type).toBe('password');
  });
});
