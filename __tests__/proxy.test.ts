import { describe, expect, test, vi } from 'vitest';
import { NextRequest, type NextResponse } from 'next/server';
import { SESSION_EXPIRATION_COOKIE } from '@/lib/auth/session-expiration';

vi.mock('@/auth', () => ({
  auth: (handler: unknown) => handler,
}));

import { proxy } from '@/proxy';

type AuthRequest = NextRequest & { auth: unknown };

const runProxy = proxy as unknown as (request: AuthRequest) => NextResponse;

function makeRequest(
  path: string,
  options?: { authenticated?: boolean; mustChangePassword?: boolean; expiration?: string }
) {
  const headers = new Headers();

  if (options?.expiration) {
    headers.set('cookie', `${SESSION_EXPIRATION_COOKIE}=${options.expiration}`);
  }

  const request = new NextRequest(`https://example.com${path}`, { headers }) as AuthRequest;
  request.auth = options?.authenticated
    ? { user: { id: '1', mustChangePassword: options.mustChangePassword === true } }
    : null;
  return request;
}

describe('proxy', () => {
  test('allows authenticated requests', () => {
    const response = runProxy(makeRequest('/dashboard/projects', { authenticated: true }));

    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  test('renews an expired cookie for authenticated requests', () => {
    const now = Date.now();
    const response = runProxy(
      makeRequest('/dashboard/projects', {
        authenticated: true,
        expiration: String(now - 1),
      })
    );

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(Number(response.cookies.get(SESSION_EXPIRATION_COOKIE)?.value)).toBeGreaterThan(now);
  });

  test('redirects first-time unauthenticated requests without an expiration reason', () => {
    const response = runProxy(makeRequest('/dashboard/projects'));

    expect(response.headers.get('location')).toBe('https://example.com/login');
    expect(response.cookies.get(SESSION_EXPIRATION_COOKIE)).toBeUndefined();
  });

  test('redirects expired sessions with a reason and clears the expiration cookie', () => {
    const response = runProxy(
      makeRequest('/dashboard/projects', { expiration: String(Date.now() - 1) })
    );

    expect(response.headers.get('location')).toBe(
      'https://example.com/login?reason=session-expired'
    );
    expect(response.cookies.get(SESSION_EXPIRATION_COOKIE)?.value).toBe('');
  });

  test('does not report early invalidation as expiration', () => {
    const response = runProxy(
      makeRequest('/dashboard/projects', { expiration: String(Date.now() + 60_000) })
    );

    expect(response.headers.get('location')).toBe('https://example.com/login');
    expect(response.cookies.get(SESSION_EXPIRATION_COOKIE)?.value).toBe('');
  });

  test('allows direct access to public routes without consuming the expiration cookie', () => {
    const response = runProxy(makeRequest('/login', { expiration: String(Date.now() - 1) }));

    expect(response.headers.get('x-middleware-next')).toBe('1');
    expect(response.cookies.get(SESSION_EXPIRATION_COOKIE)).toBeUndefined();
  });

  test.each(['/forgot-password', '/reset-password'])(
    'allows unauthenticated access to the password recovery route %s',
    (path) => {
      const response = runProxy(makeRequest(path));

      expect(response.headers.get('x-middleware-next')).toBe('1');
      expect(response.headers.get('location')).toBeNull();
    }
  );

  test('redirects users who must change password away from protected routes', () => {
    const response = runProxy(
      makeRequest('/dashboard/projects', { authenticated: true, mustChangePassword: true })
    );

    expect(response.headers.get('location')).toBe('https://example.com/password-reset');
  });

  test('redirects users who must change password away from login', () => {
    const response = runProxy(
      makeRequest('/login', { authenticated: true, mustChangePassword: true })
    );

    expect(response.headers.get('location')).toBe('https://example.com/password-reset');
  });

  test('allows the password reset route when the user must change password', () => {
    const response = runProxy(
      makeRequest('/password-reset', { authenticated: true, mustChangePassword: true })
    );

    expect(response.headers.get('x-middleware-next')).toBe('1');
  });

  test('redirects authenticated users away from password reset when no change is required', () => {
    const response = runProxy(makeRequest('/password-reset', { authenticated: true }));

    expect(response.headers.get('location')).toBe('https://example.com/dashboard');
  });
});
