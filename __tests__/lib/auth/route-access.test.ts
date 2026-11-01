import { describe, expect, test } from 'vitest';
import { canAccessRoute } from '@/lib/auth/route-access';

describe('route access', () => {
  test.each([
    '/management',
    '/management/users',
    '/management/users/new',
    '/management/users/42/edit',
    '/management/topics',
    '/management/beneficiary-categories',
    '/management/strategic-lines',
    '/management/metrics',
    '/management/history',
  ])('restricts %s to admins', (pathname) => {
    expect(canAccessRoute(pathname, 'admin')).toBe(true);
    expect(canAccessRoute(pathname, 'coordinator')).toBe(false);
  });

  test.each([
    '/dashboard',
    '/dashboard/projects',
    '/dashboard/projects/new',
    '/dashboard/projects/7',
    '/dashboard/projects/7/edit',
    '/management/profile',
  ])('allows every role on %s', (pathname) => {
    expect(canAccessRoute(pathname, 'admin')).toBe(true);
    expect(canAccessRoute(pathname, 'coordinator')).toBe(true);
  });

  test('does not treat routes that only share a prefix as restricted', () => {
    expect(canAccessRoute('/management-guide', 'coordinator')).toBe(true);
  });
});
