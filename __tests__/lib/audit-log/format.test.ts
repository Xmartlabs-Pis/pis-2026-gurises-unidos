import { describe, expect, test } from 'vitest';
import {
  auditEntityName,
  formatAuditLogCount,
  formatAuditTime,
  pageNumbers,
} from '@/lib/audit-log/format';

describe('formatAuditTime', () => {
  test('formats the time in the Montevideo timezone', () => {
    expect(formatAuditTime(new Date('2026-10-21T19:42:00.000Z'))).toBe('16:42');
  });
});

describe('auditEntityName', () => {
  test('returns the resolved name', () => {
    expect(auditEntityName({ entity: 'project', entityId: 12, entityName: 'Huerta' })).toBe(
      'Huerta'
    );
  });

  test('falls back to the entity and id when the record no longer exists', () => {
    expect(auditEntityName({ entity: 'project', entityId: 12, entityName: null })).toBe(
      'Proyecto #12'
    );
  });
});

describe('pageNumbers', () => {
  test('lists every page when there are few', () => {
    expect(pageNumbers(2, 3)).toEqual([1, 2, 3]);
  });

  test('collapses distant pages into gaps', () => {
    expect(pageNumbers(5, 10)).toEqual([1, 'gap', 4, 5, 6, 'gap', 10]);
  });

  test('keeps the edges next to the current page', () => {
    expect(pageNumbers(1, 10)).toEqual([1, 2, 'gap', 10]);
  });
});

describe('formatAuditLogCount', () => {
  test.each([
    [0, 'No hay resultados'],
    [1, '1 registro'],
    [37, '37 registros'],
  ])('formats %i', (count, expected) => {
    expect(formatAuditLogCount(count)).toBe(expected);
  });
});
