import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { resetPasswordMock } = vi.hoisted(() => ({
  resetPasswordMock: vi.fn<(state: object, formData: FormData) => Promise<object>>(),
}));

vi.mock('@/app/actions/password', () => ({ resetPassword: resetPasswordMock }));

import { ResetPasswordDialog } from '@/components/users/reset-password-dialog';

beforeEach(() => {
  resetPasswordMock.mockReset();
  resetPasswordMock.mockResolvedValue({ success: true });
});

describe('ResetPasswordDialog', () => {
  test('resets the password of the selected user with a generated temporary password', async () => {
    render(<ResetPasswordDialog userId={7} userName="Ana García" />);

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));

    const passwordInput = (await screen.findByLabelText('Contraseña temporal')) as HTMLInputElement;
    const generatedPassword = passwordInput.value;

    expect(generatedPassword).not.toBe('');
    expect(screen.getByText('¿Restablecer la contraseña de Ana García?')).toBeDefined();

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(await screen.findByText('Contraseña de Ana García restablecida')).toBeDefined();

    const formData = resetPasswordMock.mock.calls[0][1];
    expect(formData.get('userId')).toBe('7');
    expect(formData.get('newPassword')).toBe(generatedPassword);
  });

  test('blocks invalid temporary passwords', async () => {
    render(<ResetPasswordDialog userId={7} userName="Ana García" />);

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));
    fireEvent.change(await screen.findByLabelText('Contraseña temporal'), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Restablecer' }));

    expect(await screen.findByText('La contraseña debe tener al menos 8 caracteres')).toBeDefined();
    expect(resetPasswordMock).not.toHaveBeenCalled();
  });

  test('generates a new temporary password every time the dialog opens', async () => {
    render(<ResetPasswordDialog userId={7} userName="Ana García" />);

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));
    const firstPassword = (
      (await screen.findByLabelText('Contraseña temporal')) as HTMLInputElement
    ).value;
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
    await waitFor(() => expect(screen.queryByLabelText('Contraseña temporal')).toBeNull());

    fireEvent.click(screen.getByRole('button', { name: 'Restablecer contraseña' }));
    const secondPassword = (
      (await screen.findByLabelText('Contraseña temporal')) as HTMLInputElement
    ).value;

    expect(secondPassword).not.toBe(firstPassword);
  });
});
