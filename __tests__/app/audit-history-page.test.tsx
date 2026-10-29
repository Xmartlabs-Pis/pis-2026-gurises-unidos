import { render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  forbidden: vi.fn(() => {
    throw new Error('NEXT_FORBIDDEN');
  }),
  listAuditLog: vi.fn(),
  listAuditLogAuthors: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('next/navigation', () => ({ forbidden: mocks.forbidden, redirect: mocks.redirect }));
vi.mock('@/lib/audit-log/list', () => ({
  listAuditLog: mocks.listAuditLog,
  listAuditLogAuthors: mocks.listAuditLogAuthors,
}));
vi.mock('@/components/audit-log/audit-log-toolbar', () => ({ AuditLogToolbar: () => null }));
vi.mock('@/components/audit-log/audit-log-pagination', () => ({
  AuditLogPagination: () => null,
}));

import AuditHistoryPage from '@/app/(protected)/management/history/page';

function renderPage(params: Record<string, string> = {}) {
  return AuditHistoryPage({ searchParams: Promise.resolve(params) });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: '1', role: 'admin' } });
  mocks.listAuditLogAuthors.mockResolvedValue([]);
  mocks.listAuditLog.mockResolvedValue({
    items: [
      {
        id: 1,
        action: 'update',
        entity: 'project',
        entityId: 12,
        entityName: 'Huerta Cerro Norte',
        summary: 'Cambió: Nombre, Zona',
        occurredAt: new Date('2026-10-21T19:42:00.000Z'),
        author: { id: 1, firstName: 'Lucía', lastName: 'Fernández', role: 'admin' },
      },
    ],
    total: 1,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  });
});

describe('AuditHistoryPage', () => {
  it.each([
    ['a coordinator', { user: { id: '2', role: 'coordinator' } }, 'NEXT_FORBIDDEN'],
    ['an anonymous visitor', null, 'NEXT_REDIRECT:/login'],
  ])('denies access to %s without querying the log', async (_, session, error) => {
    mocks.auth.mockResolvedValue(session);

    await expect(renderPage()).rejects.toThrow(error);

    expect(mocks.listAuditLog).not.toHaveBeenCalled();
  });

  it('lists the entries for an admin', async () => {
    render((await renderPage()) as ReactElement);

    expect(screen.getByRole('heading', { name: 'Historial de cambios' })).toBeDefined();
    expect(screen.getAllByText('Huerta Cerro Norte').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cambió: Nombre, Zona').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Edición').length).toBeGreaterThan(0);
  });

  it('passes the parsed filters to the query', async () => {
    await renderPage({ action: 'update', entity: 'user', page: '2' });

    expect(mocks.listAuditLog).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'update', entity: 'user', page: 2 })
    );
  });

  it('renders failed logins without an authenticated author', async () => {
    mocks.listAuditLog.mockResolvedValue({
      items: [
        {
          id: 2,
          action: 'loginFailure',
          entity: 'authentication',
          entityId: null,
          entityName: 'Cédula ingresada: 65432105',
          summary: 'Autenticación fallida',
          occurredAt: new Date('2026-10-27T17:35:12.000Z'),
          author: null,
        },
      ],
      total: 1,
      page: 1,
      pageSize: 20,
      totalPages: 1,
    });

    render((await renderPage({ action: 'loginFailure' })) as ReactElement);

    expect(screen.getAllByText('Sin autenticar')).toHaveLength(2);
    expect(screen.getAllByText('Acceso fallido')).toHaveLength(2);
    expect(screen.getAllByText('Cédula ingresada: 65432105')).toHaveLength(2);
    expect(screen.getAllByText(/14:35:12/)).toHaveLength(2);
  });

  it('redirects to the canonical url when params are invalid', async () => {
    await expect(renderPage({ action: 'foo', page: '1' })).rejects.toThrow(
      'NEXT_REDIRECT:/management/history'
    );
  });
});
