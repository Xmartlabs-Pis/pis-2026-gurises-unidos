import { act, fireEvent, render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { login } from '@/app/actions/auth';
import { LoginForm } from '@/components/login-form';

vi.mock('@/app/actions/auth', () => ({
  login: vi.fn(async () => ({})),
}));

test('shows the session expiration message when requested', () => {
  render(<LoginForm sessionExpired />);

  expect(screen.getByRole('status').textContent).toBe(
    'Tu sesión se cerró por inactividad. Iniciá sesión nuevamente para continuar.'
  );
});

test('does not show the session expiration message by default', () => {
  render(<LoginForm />);

  expect(screen.queryByRole('status')).toBeNull();
});

test('hides the session expiration message after a failed login', async () => {
  vi.mocked(login).mockResolvedValueOnce({ formError: 'Invalid credentials' });
  render(<LoginForm sessionExpired />);

  fireEvent.change(screen.getByLabelText('Cédula'), { target: { value: '77777777' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password' } });

  await act(async () => {
    fireEvent.submit(screen.getByRole('button', { name: 'Ingresar' }).closest('form')!);
  });

  expect(await screen.findByText('Credenciales incorrectas')).toBeDefined();
  expect(screen.queryByRole('status')).toBeNull();
});
