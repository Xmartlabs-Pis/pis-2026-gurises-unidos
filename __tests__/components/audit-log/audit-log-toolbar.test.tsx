import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { updateFilters, clearFilters } = vi.hoisted(() => ({
  updateFilters: vi.fn(),
  clearFilters: vi.fn(),
}));

vi.mock('@/hooks/use-url-filters', () => ({
  useUrlFilters: () => ({ updateFilters, clearFilters }),
}));

import { AuditLogToolbar } from '@/components/audit-log/audit-log-toolbar';
import { parseAuditLogFilters } from '@/lib/validation/audit-log-filters';

function renderToolbar(params: Record<string, string> = {}) {
  render(<AuditLogToolbar filters={parseAuditLogFilters(params)} total={3} authors={[]} />);
  fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
  return screen.getByLabelText('Desde') as HTMLInputElement;
}

beforeEach(() => {
  updateFilters.mockClear();
  clearFilters.mockClear();
});

describe('AuditLogToolbar date filters', () => {
  it.each(['Desde', 'Hasta'])('preserves an excessive year in %s without applying it', (label) => {
    renderToolbar();
    const input = screen.getByLabelText(label) as HTMLInputElement;
    expect(input.max).toBe('2100-12-31');
    fireEvent.change(input, { target: { value: '99999-12-31' } });
    fireEvent.blur(input);
    expect(input.value).toBe('99999-12-31');
    expect(screen.getByRole('alert').textContent).toBe(
      'La fecha no puede ser posterior al 31/12/2100.'
    );
    expect(updateFilters).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Escape' });
    fireEvent.click(screen.getByRole('button', { name: /Filtros/ }));
    expect((screen.getByLabelText(label) as HTMLInputElement).value).toBe('99999-12-31');
    expect(updateFilters).not.toHaveBeenCalled();
  });

  it.each(['Desde', 'Hasta'])('allows correcting %s to the maximum date', (label) => {
    renderToolbar();
    const input = screen.getByLabelText(label);
    fireEvent.change(input, { target: { value: '2101-01-01' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(updateFilters).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '2100-12-31' } });
    fireEvent.blur(input);
    expect(screen.queryByRole('alert')).toBeNull();
    expect(updateFilters).toHaveBeenCalledWith({
      [label === 'Desde' ? 'from' : 'to']: '2100-12-31',
    });
  });

  it('clears invalid drafts and their errors', () => {
    const input = renderToolbar();
    fireEvent.change(input, { target: { value: '2101-01-01' } });
    fireEvent.blur(input);
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(input.value).toBe('');
    expect(screen.queryByRole('alert')).toBeNull();
    expect(clearFilters).toHaveBeenCalled();
  });

  it('keeps the applied date when its replacement is out of range', () => {
    const input = renderToolbar({ from: '2026-05-10' });
    fireEvent.change(input, { target: { value: '2101-01-01' } });
    fireEvent.blur(input);
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(updateFilters).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /Filtros/ }).getAttribute('aria-description')).toBe(
      '1 filtro activo'
    );
  });

  it.each([
    [{}, '0 filtros activos'],
    [{ entity: 'user' }, '1 filtro activo'],
    [{ entity: 'user', from: '2026-05-10' }, '2 filtros activos'],
  ])('describes the active filter count for %o', (params, description) => {
    renderToolbar(params);
    expect(screen.getByRole('button', { name: /Filtros/ }).getAttribute('aria-description')).toBe(
      description
    );
  });

  it('waits until the field loses focus before applying a typed date', () => {
    const from = renderToolbar();

    fireEvent.change(from, { target: { value: '0002-05-10' } });
    expect(updateFilters).not.toHaveBeenCalled();
    expect(from.value).toBe('0002-05-10');

    fireEvent.change(from, { target: { value: '2026-05-10' } });
    fireEvent.blur(from);

    expect(updateFilters).toHaveBeenCalledExactlyOnceWith({ from: '2026-05-10' });
  });

  it('applies the date on Enter', () => {
    const from = renderToolbar();

    fireEvent.change(from, { target: { value: '2026-05-10' } });
    fireEvent.keyDown(from, { key: 'Enter' });

    expect(updateFilters).toHaveBeenCalledWith({ from: '2026-05-10' });
  });

  it('applies the pending date when the popover is closed with Escape', () => {
    const from = renderToolbar();

    fireEvent.change(from, { target: { value: '2026-05-10' } });
    fireEvent.keyDown(from, { key: 'Escape' });

    expect(updateFilters).toHaveBeenCalledWith({ from: '2026-05-10' });
  });

  it('removes the filter when the date is cleared', () => {
    const from = renderToolbar({ from: '2026-05-10' });

    fireEvent.change(from, { target: { value: '' } });
    fireEvent.blur(from);

    expect(updateFilters).toHaveBeenCalledWith({ from: null });
  });

  it('does not navigate when the date did not change', () => {
    const from = renderToolbar({ from: '2026-05-10' });

    fireEvent.blur(from);

    expect(updateFilters).not.toHaveBeenCalled();
  });

  it('counts and clears every active filter', () => {
    renderToolbar({ entity: 'user', from: '2026-05-10' });

    expect(screen.getByRole('button', { name: /Filtros/ }).textContent).toContain('2');
    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(clearFilters).toHaveBeenCalledWith(['entity', 'authorId', 'documentId', 'from', 'to']);
  });

  it('filters failed logins from the action tabs', () => {
    render(<AuditLogToolbar filters={parseAuditLogFilters({})} total={3} authors={[]} />);

    fireEvent.click(screen.getByRole('tab', { name: 'Accesos fallidos' }));

    expect(updateFilters).toHaveBeenCalledWith({ action: 'loginFailure' });
  });

  it('normalizes an entered document id and applies it on Enter', () => {
    renderToolbar();
    const input = screen.getByLabelText('Cédula ingresada');

    fireEvent.change(input, { target: { value: '6.543.210-5' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(updateFilters).toHaveBeenCalledWith({ documentId: '65432105' });
  });
});
