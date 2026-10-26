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
    expect(clearFilters).toHaveBeenCalledWith(['entity', 'authorId', 'from', 'to']);
  });
});
