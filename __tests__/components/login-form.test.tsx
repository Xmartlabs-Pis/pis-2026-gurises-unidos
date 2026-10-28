import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import { login } from '@/app/actions/auth';
import { LoginForm } from '@/components/login-form';

vi.mock('@/app/actions/auth', () => ({
  login: vi.fn(async () => ({})),
}));

afterEach(() => {
  vi.useRealTimers();
});

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

test('counts down only for the blocked document and enables submission when the wait expires', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-26T15:00:00Z'));
  vi.mocked(login).mockResolvedValueOnce({
    formError: 'Login cooldown',
    documentId: '11111111',
    nextAllowedAt: '2026-10-26T15:05:00.000Z',
    retryAfterSeconds: 300,
  });
  render(<LoginForm />);
  const documentInput = screen.getByLabelText('Cédula');
  const passwordInput = screen.getByLabelText('Contraseña');
  const button = screen.getByRole('button', { name: 'Ingresar' }) as HTMLButtonElement;
  fireEvent.change(documentInput, { target: { value: '1.111.111-1' } });
  fireEvent.change(passwordInput, { target: { value: 'password' } });
  await act(async () => {
    fireEvent.submit(button.closest('form')!);
  });

  expect(button.disabled).toBe(true);
  expect(screen.getByRole('status').textContent).toContain('5:00');
  expect(screen.queryByText('Credenciales incorrectas')).toBeNull();
  const submittedAttempts = vi.mocked(login).mock.calls.length;
  await act(async () => {
    fireEvent.submit(button.closest('form')!);
  });
  expect(login).toHaveBeenCalledTimes(submittedAttempts);

  fireEvent.change(passwordInput, { target: { value: 'another-password' } });
  expect(button.disabled).toBe(true);
  fireEvent.change(documentInput, { target: { value: '77777777' } });
  expect(button.disabled).toBe(false);
  expect(screen.queryByRole('status')).toBeNull();

  await act(async () => {
    await vi.advanceTimersByTimeAsync(60_000);
  });
  fireEvent.change(documentInput, { target: { value: '11111111' } });
  expect(button.disabled).toBe(true);
  expect(screen.getByRole('status').textContent).toContain('4:00');

  await act(async () => {
    await vi.advanceTimersByTimeAsync(240_000);
  });
  expect(button.disabled).toBe(false);
  expect(screen.queryByRole('status')).toBeNull();
});

test('keeps the cooldown for each document after submitting a different one', async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-26T15:00:00Z'));
  vi.mocked(login)
    .mockResolvedValueOnce({
      formError: 'Login cooldown',
      documentId: '11111111',
      nextAllowedAt: '2026-10-26T15:05:00.000Z',
      retryAfterSeconds: 300,
    })
    .mockResolvedValueOnce({ formError: 'Invalid credentials', documentId: '77777777' });
  render(<LoginForm />);
  const documentInput = screen.getByLabelText('Cédula');
  const button = screen.getByRole('button', { name: 'Ingresar' }) as HTMLButtonElement;
  fireEvent.change(documentInput, { target: { value: '11111111' } });
  fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password' } });
  await act(async () => {
    fireEvent.submit(button.closest('form')!);
  });
  fireEvent.change(documentInput, { target: { value: '77777777' } });
  await act(async () => {
    fireEvent.submit(button.closest('form')!);
  });
  fireEvent.change(documentInput, { target: { value: '11111111' } });

  expect(button.disabled).toBe(true);
  expect(screen.getByRole('status').textContent).toContain('5:00');
});

test.each([-60, 60])(
  'keeps a five-minute countdown when the client clock is offset by %i minutes',
  async (offsetMinutes) => {
    vi.useFakeTimers();
    const serverTime = new Date('2026-10-26T15:00:00Z').getTime();
    vi.setSystemTime(serverTime + offsetMinutes * 60_000);
    vi.mocked(login).mockResolvedValueOnce({
      formError: 'Login cooldown',
      documentId: '11111111',
      nextAllowedAt: new Date(serverTime + 300_000).toISOString(),
      retryAfterSeconds: 300,
    });
    render(<LoginForm />);
    fireEvent.change(screen.getByLabelText('Cédula'), { target: { value: '11111111' } });
    fireEvent.change(screen.getByLabelText('Contraseña'), { target: { value: 'password' } });
    const button = screen.getByRole('button', { name: 'Ingresar' }) as HTMLButtonElement;

    await act(async () => {
      fireEvent.submit(button.closest('form')!);
    });

    expect(button.disabled).toBe(true);
    expect(screen.getByRole('status').textContent).toContain('5:00');
    vi.setSystemTime(serverTime + 60 * 60_000);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });
    expect(screen.getByRole('status').textContent).toContain('4:00');
    await act(async () => {
      await vi.advanceTimersByTimeAsync(240_000);
    });
    expect(button.disabled).toBe(false);
  }
);
