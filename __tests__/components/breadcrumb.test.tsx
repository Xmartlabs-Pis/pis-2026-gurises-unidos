import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';

const { pathnameMock } = vi.hoisted(() => ({ pathnameMock: vi.fn() }));

vi.mock('next/navigation', () => ({ usePathname: pathnameMock }));

import { AppBreadcrumb } from '@/components/breadcrumb';

beforeEach(() => {
  pathnameMock.mockReset();
});

test('links the dashboard root crumb', () => {
  pathnameMock.mockReturnValue('/dashboard/projects');

  render(<AppBreadcrumb />);

  expect(screen.getByText('Dashboard').closest('a')?.getAttribute('href')).toBe('/dashboard');
});

test.each(['/management/users', '/management/metrics', '/management/users/5/edit'])(
  'hides the administration crumb of %s',
  (pathname) => {
    pathnameMock.mockReturnValue(pathname);

    render(<AppBreadcrumb />);

    expect(screen.queryByText('Administración')).toBeNull();
  }
);

test('links the management section root crumb', () => {
  pathnameMock.mockReturnValue('/management/users/new');

  render(<AppBreadcrumb />);

  expect(screen.getByText('Usuarios').closest('a')?.getAttribute('href')).toBe('/management/users');
});

test('labels the profile crumb in spanish', () => {
  pathnameMock.mockReturnValue('/management/profile');

  render(<AppBreadcrumb />);

  expect(screen.getByText('Perfil')).toBeTruthy();
});

test('links the project name crumb when editing a project', () => {
  pathnameMock.mockReturnValue('/dashboard/projects/5/edit');

  render(<AppBreadcrumb resourceLabel="Proyecto Uno" />);

  expect(screen.getByText('Proyecto Uno').closest('a')?.getAttribute('href')).toBe(
    '/dashboard/projects/5'
  );
  expect(screen.getByText('Editar')).toBeTruthy();
});

test('skips the user id crumb when editing a user because it has no page', () => {
  pathnameMock.mockReturnValue('/management/users/5/edit');

  render(<AppBreadcrumb />);

  expect(screen.queryByText('Detalles')).toBeNull();
});
