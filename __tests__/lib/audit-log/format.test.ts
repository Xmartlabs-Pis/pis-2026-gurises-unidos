import { describe, expect, test } from 'vitest';
import {
  auditEntityName,
  formatAuditValue,
  PROJECT_VALUE_LABELS,
  formatAuditLogCount,
  formatAuditTime,
  pageNumbers,
} from '@/lib/audit-log/format';

describe('formatAuditTime', () => {
  test('formats the time in the Montevideo timezone', () => {
    expect(formatAuditTime(new Date('2026-10-21T19:42:13.000Z'))).toBe('16:42:13');
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

describe('formatAuditValue', () => {
  test.each([
    ['status', 'active', 'Activo'],
    ['status', 'inactive', 'Inactivo'],
    ['zone', 'city', 'Montevideo'],
    ['zone', 'rural', 'Rural'],
    ['intensity', 'high', 'Alta'],
    ['counterpartyType', 'privateSector', 'Sector Privado'],
    ['geographicScope', 'international', 'Internacional'],
    ['endYear', null, 'Sin datos'],
    ['endYear', undefined, 'Sin datos'],
    ['name', '', 'Sin datos'],
    ['countries', [], 'Sin datos'],
    ['countries', ['Argentina', 'Brasil'], 'Argentina, Brasil'],
    [
      'topics',
      [
        { id: 1, name: 'Salud' },
        { id: 2, name: 'Educación' },
      ],
      'Salud, Educación',
    ],
    ['leadCoordinatorId', { id: 1, name: 'Ana Pérez' }, 'Ana Pérez'],
    ['leadCoordinatorId', { id: 1 }, 'Sin datos'],
    ['leadCoordinatorId', {}, 'Sin datos'],
    ['showOnLanding', false, 'No'],
    ['showOnLanding', true, 'Sí'],
    ['families', 0, '0'],
    ['status', '__proto__', '__proto__'],
  ] satisfies [string, unknown, string][])('formats %s values', (field, value, expected) => {
    expect(formatAuditValue(field, value, PROJECT_VALUE_LABELS)).toBe(expected);
  });
});
