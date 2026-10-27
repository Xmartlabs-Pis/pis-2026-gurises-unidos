import { beforeEach, describe, expect, test, vi } from 'vitest';
import { AuthError, CredentialsSignin } from 'next-auth';
import { redirect } from 'next/navigation';
import { login, logout } from '@/app/actions/auth';
import { auth, signIn, signOut } from '@/auth';
import { LoginCooldownError } from '@/lib/auth/login-cooldown-error';
import {
  SESSION_EXPIRATION_COOKIE,
  SESSION_EXPIRATION_COOKIE_OPTIONS,
} from '@/lib/auth/session-expiration';

const cookieStore = vi.hoisted(() => ({
  set: vi.fn(),
  delete: vi.fn(),
}));

vi.mock('next-auth', () => import('@auth/core/errors'));

vi.mock('@/auth', () => ({
  auth: vi.fn(),
  signIn: vi.fn(),
  signOut: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => cookieStore),
}));

function makeFormData(documentId: string, password: string, remember = false) {
  const formData = new FormData();
  formData.set('documentId', documentId);
  formData.set('password', password);
  if (remember) {
    formData.set('rememberCheck', 'on');
  }
  return formData;
}

describe('login', () => {
  beforeEach(() => {
    vi.mocked(signIn).mockReset();
    vi.mocked(auth).mockReset();
    vi.mocked(redirect).mockReset();
    cookieStore.set.mockReset();
    vi.mocked(redirect).mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
    vi.mocked(auth).mockResolvedValue({
      user: { mustChangePassword: false },
    } as never);
  });

  test('signs in with the normalized document id and redirects to the dashboard', async () => {
    vi.mocked(signIn).mockResolvedValue(undefined);

    await expect(login({}, makeFormData('1.111.111-1', 'password'))).rejects.toThrow(
      'NEXT_REDIRECT'
    );

    expect(signIn).toHaveBeenCalledWith('credentials', {
      documentId: '11111111',
      password: 'password',
      remember: 'false',
      redirect: false,
    });
    expect(cookieStore.set).toHaveBeenCalledWith(
      SESSION_EXPIRATION_COOKIE,
      expect.any(String),
      SESSION_EXPIRATION_COOKIE_OPTIONS
    );
    expect(Number(cookieStore.set.mock.calls[0][1])).toBeGreaterThan(Date.now());
    expect(redirect).toHaveBeenCalledWith('/dashboard');
  });

  test('redirects to password reset when mustChangePassword is true', async () => {
    vi.mocked(signIn).mockResolvedValue(undefined);
    vi.mocked(auth).mockResolvedValue({
      user: { mustChangePassword: true },
    } as never);

    await expect(login({}, makeFormData('1.111.111-1', 'password'))).rejects.toThrow(
      'NEXT_REDIRECT'
    );

    expect(cookieStore.set).toHaveBeenCalledWith(
      SESSION_EXPIRATION_COOKIE,
      expect.any(String),
      SESSION_EXPIRATION_COOKIE_OPTIONS
    );
    expect(redirect).toHaveBeenCalledWith('/password-reset');
  });

  test('passes remember: "true" when the checkbox is checked', async () => {
    vi.mocked(signIn).mockResolvedValue(undefined);

    await expect(login({}, makeFormData('1.111.111-1', 'password', true))).rejects.toThrow(
      'NEXT_REDIRECT'
    );

    expect(signIn).toHaveBeenCalledWith(
      'credentials',
      expect.objectContaining({ remember: 'true' })
    );
    expect(cookieStore.set).toHaveBeenCalledWith(
      SESSION_EXPIRATION_COOKIE,
      expect.any(String),
      expect.objectContaining({
        maxAge: SESSION_EXPIRATION_COOKIE_OPTIONS.maxAge,
      })
    );
  });

  test.each([
    ['AuthError', () => new AuthError()],
    ['CredentialsSignin', () => new CredentialsSignin()],
  ])('returns invalid credentials with the raw document id on %s', async (_name, makeError) => {
    vi.mocked(signIn).mockRejectedValue(makeError());

    await expect(login({}, makeFormData('1.111.111-1', 'wrong'))).resolves.toEqual({
      formError: 'Invalid credentials',
      documentId: '1.111.111-1',
    });
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  test('rethrows errors that are not AuthError', async () => {
    vi.mocked(signIn).mockRejectedValue(new Error('network'));

    await expect(login({}, makeFormData('11111111', 'password'))).rejects.toThrow('network');
    expect(redirect).not.toHaveBeenCalled();
  });

  test('returns the persisted next attempt date and normalized document id on cooldown', async () => {
    const nextAllowedAt = new Date('2026-10-26T15:05:00Z');
    vi.mocked(signIn).mockRejectedValue(new LoginCooldownError(nextAllowedAt));

    await expect(login({}, makeFormData('1.111.111-1', 'password'))).resolves.toEqual({
      formError: 'Login cooldown',
      documentId: '11111111',
      nextAllowedAt: nextAllowedAt.toISOString(),
    });
    expect(cookieStore.set).not.toHaveBeenCalled();
    expect(auth).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  test('ignores previous login state', async () => {
    vi.mocked(signIn).mockRejectedValue(new AuthError());

    await expect(
      login({ formError: 'old', documentId: 'old' }, makeFormData('1.111.111-1', 'wrong'))
    ).resolves.toEqual({
      formError: 'Invalid credentials',
      documentId: '1.111.111-1',
    });
  });

  test('rejects a document id that fails the Uruguayan checksum without calling signIn', async () => {
    const result = await login({}, makeFormData('41234567', 'password'));

    expect(result.errors?.documentId).toBeDefined();
    expect(signIn).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });

  test('returns validation errors when fields are missing, without calling signIn', async () => {
    const result = await login({}, new FormData());

    expect(result.errors?.documentId).toBeDefined();
    expect(result.errors?.password).toBeDefined();
    expect(signIn).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});

describe('logout', () => {
  beforeEach(() => {
    vi.mocked(signOut).mockReset();
    cookieStore.delete.mockReset();
  });

  test('calls signOut with the public dashboard as redirect target', async () => {
    vi.mocked(signOut).mockResolvedValue(undefined);

    await logout();

    expect(cookieStore.delete).toHaveBeenCalledWith(SESSION_EXPIRATION_COOKIE);
    expect(signOut).toHaveBeenCalledWith({ redirectTo: '/' });
  });
});
