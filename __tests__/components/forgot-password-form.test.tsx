import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const { requestPasswordResetMock } = vi.hoisted(() => ({
  requestPasswordResetMock: vi.fn(),
}));

vi.mock('@/app/actions/password-recovery', () => ({
  requestPasswordReset: requestPasswordResetMock,
}));

import { ForgotPasswordForm } from '@/components/forgot-password-form';

function emailInput() {
  return screen.getByLabelText('Correo electrónico');
}

async function submitEmail(email: string) {
  fireEvent.change(emailInput(), { target: { value: email } });
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Enviar enlace' }));
  });
}

beforeEach(() => {
  requestPasswordResetMock.mockReset().mockResolvedValue({});
});

describe('ForgotPasswordForm', () => {
  test('blocks submission when the email is invalid', async () => {
    render(<ForgotPasswordForm />);

    await submitEmail('not-an-email');

    expect(await screen.findByText('Ingresá un correo electrónico válido.')).toBeDefined();
    expect(requestPasswordResetMock).not.toHaveBeenCalled();
  });

  test('submits the email and shows the confirmation', async () => {
    requestPasswordResetMock.mockResolvedValue({ success: true });
    render(<ForgotPasswordForm />);

    await submitEmail('ana@example.com');

    expect((await screen.findByRole('status')).textContent).toContain(
      'Si el correo está registrado'
    );
    const formData = requestPasswordResetMock.mock.calls[0][1] as FormData;
    expect(formData.get('email')).toBe('ana@example.com');
    expect(screen.queryByRole('button', { name: 'Enviar enlace' })).toBeNull();
  });

  test('displays a server error and clears it when typing', async () => {
    requestPasswordResetMock.mockResolvedValue({ errors: { email: ['Correo rechazado'] } });
    render(<ForgotPasswordForm />);

    await submitEmail('ana@example.com');

    expect(await screen.findByText('Correo rechazado')).toBeDefined();

    fireEvent.change(emailInput(), { target: { value: 'ana2@example.com' } });

    await waitFor(() => expect(screen.queryByText('Correo rechazado')).toBeNull());
  });
});
