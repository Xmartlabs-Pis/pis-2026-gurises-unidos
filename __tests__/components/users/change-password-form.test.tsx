import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { changePasswordMock, replaceMock, notifyErrorMock } = vi.hoisted(() => ({
  changePasswordMock: vi.fn(),
  replaceMock: vi.fn(),
  notifyErrorMock: vi.fn(),
}));

vi.mock('@/app/actions/password', () => ({ changePassword: changePasswordMock }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ replace: replaceMock }) }));
vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn(), error: notifyErrorMock } }));

import { ChangePasswordForm } from '@/components/users/change-password-form';

function fillForm(currentPassword: string, newPassword: string, confirmNewPassword: string) {
  fireEvent.change(screen.getByLabelText('Contraseña actual'), {
    target: { value: currentPassword },
  });
  fireEvent.change(screen.getByLabelText('Nueva contraseña'), { target: { value: newPassword } });
  fireEvent.change(screen.getByLabelText('Confirmar nueva contraseña'), {
    target: { value: confirmNewPassword },
  });
}

async function submitForm() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Cambiar contraseña' }));
  });
}

beforeEach(() => {
  changePasswordMock.mockReset();
  replaceMock.mockReset();
  notifyErrorMock.mockReset();
});

describe('ChangePasswordForm', () => {
  test('blocks submission and displays client validation errors', async () => {
    render(<ChangePasswordForm />);

    fillForm('', 'Abcdefg1', 'Abcdefg2');
    await submitForm();

    expect(await screen.findByText('Ingresá tu contraseña actual')).toBeDefined();
    expect(screen.getByText('Las contraseñas no coinciden')).toBeDefined();
    expect(changePasswordMock).not.toHaveBeenCalled();
  });

  test('toggles the visibility of each password field', () => {
    render(<ChangePasswordForm />);
    const currentPasswordInput = screen.getByLabelText('Contraseña actual') as HTMLInputElement;
    const newPasswordInput = screen.getByLabelText('Nueva contraseña') as HTMLInputElement;

    expect(currentPasswordInput.type).toBe('password');

    fireEvent.click(screen.getAllByRole('button', { name: 'Mostrar texto' })[0]);

    expect(currentPasswordInput.type).toBe('text');
    expect(newPasswordInput.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: 'Ocultar texto' }));

    expect(currentPasswordInput.type).toBe('password');
  });

  test('sends the user to the login after changing the password', async () => {
    changePasswordMock.mockResolvedValue({ success: true });
    render(<ChangePasswordForm />);

    fillForm('Old12345', 'Abcdefg1', 'Abcdefg1');
    await submitForm();

    await waitFor(() => expect(replaceMock).toHaveBeenCalledWith('/login?passwordChanged=1'));
  });

  test('keeps the session when the password change fails', async () => {
    changePasswordMock.mockResolvedValue({ formError: 'La contraseña actual es incorrecta' });
    render(<ChangePasswordForm />);

    fillForm('Wrong123', 'Abcdefg1', 'Abcdefg1');
    await submitForm();

    await waitFor(() =>
      expect(notifyErrorMock).toHaveBeenCalledWith({ title: 'La contraseña actual es incorrecta' })
    );
    expect(replaceMock).not.toHaveBeenCalled();
  });
});
