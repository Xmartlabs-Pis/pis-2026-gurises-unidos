import { describe, expect, it } from 'vitest';
import {
  AUDIT_LOG_DEFAULT_PAGE_SIZE,
  parseAuditLogFilters,
  toCanonicalAuditLogQuery,
} from '@/lib/validation/audit-log-filters';

describe('parseAuditLogFilters', () => {
  it('applies the defaults when there are no params', () => {
    expect(parseAuditLogFilters({})).toEqual({
      action: undefined,
      entity: undefined,
      authorId: undefined,
      from: undefined,
      to: undefined,
      page: 1,
      pageSize: AUDIT_LOG_DEFAULT_PAGE_SIZE,
    });
  });

  it('keeps valid filters', () => {
    expect(
      parseAuditLogFilters({
        action: 'deletion',
        entity: 'project',
        authorId: '4',
        from: '2026-10-01',
        to: '2026-10-21',
        page: '3',
        pageSize: '50',
      })
    ).toEqual({
      action: 'deletion',
      entity: 'project',
      authorId: 4,
      from: '2026-10-01',
      to: '2026-10-21',
      page: 3,
      pageSize: 50,
    });
  });

  it('drops invalid values', () => {
    expect(
      parseAuditLogFilters({
        action: 'passwordReset',
        entity: 'invoice',
        authorId: '-1',
        from: '21/10/2026',
        to: '2026-13-40',
        page: '0',
        pageSize: '7',
      })
    ).toEqual({
      action: undefined,
      entity: undefined,
      authorId: undefined,
      from: undefined,
      to: undefined,
      page: 1,
      pageSize: AUDIT_LOG_DEFAULT_PAGE_SIZE,
    });
  });

  it.each(['metric', 'topic', 'beneficiaryCategory'])('drops the %s entity', (entity) => {
    expect(parseAuditLogFilters({ entity }).entity).toBeUndefined();
  });

  it('drops an author id beyond the database integer range', () => {
    expect(parseAuditLogFilters({ authorId: '99999999999' }).authorId).toBeUndefined();
  });

  it('uses the first value of repeated params', () => {
    expect(parseAuditLogFilters({ action: ['update', 'creation'] }).action).toBe('update');
  });

  it('swaps a reversed date range', () => {
    expect(parseAuditLogFilters({ from: '2026-10-21', to: '2026-10-01' })).toMatchObject({
      from: '2026-10-01',
      to: '2026-10-21',
    });
  });
});

describe('toCanonicalAuditLogQuery', () => {
  it('omits the default page and page size', () => {
    expect(toCanonicalAuditLogQuery(parseAuditLogFilters({ action: 'update' }))).toEqual({
      action: 'update',
      entity: undefined,
      authorId: undefined,
      from: undefined,
      to: undefined,
      page: undefined,
      pageSize: undefined,
    });
  });

  it('keeps a non-default page and page size', () => {
    expect(
      toCanonicalAuditLogQuery(parseAuditLogFilters({ page: '2', pageSize: '100' }))
    ).toMatchObject({ page: 2, pageSize: 100 });
  });
});
