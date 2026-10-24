import { describe, expect, test, vi } from 'vitest';

const { getBeneficiaryCategoryLabels } = vi.hoisted(() => ({
  getBeneficiaryCategoryLabels: vi.fn(async () => ({ families: 'Familias' })),
}));

vi.mock('@/lib/beneficiary-categories', () => ({ getBeneficiaryCategoryLabels }));

import { prismaMock } from '../../mocks/prisma';
import { buildAuditLogWhere, listAuditLog } from '@/lib/audit-log/list';
import { parseAuditLogFilters } from '@/lib/validation/audit-log-filters';

const AUTHOR = { id: 1, firstName: 'Lucía', lastName: 'Fernández', role: 'admin' };
const OCCURRED_AT = new Date('2026-10-21T15:00:00.000Z');
const LISTED_ACTIONS = { in: ['creation', 'update', 'deletion'] };
const LISTED_ENTITIES = { in: ['project', 'beneficiary', 'user'] };

function row(id: number, entity: string, entityId: number, details: unknown = null) {
  return {
    id,
    action: 'update',
    entity,
    entityId,
    details,
    occurredAt: OCCURRED_AT,
    author: AUTHOR,
  };
}

function mockEntityLookups() {
  prismaMock.project.findMany.mockResolvedValue([{ id: 12, name: 'Huerta Cerro Norte' }]);
  prismaMock.projectBeneficiary.findMany.mockResolvedValue([
    { id: 5, year: 2026, project: { name: 'Merendero Las Acacias' } },
  ]);
  prismaMock.user.findMany.mockResolvedValue([{ id: 8, firstName: 'Ana', lastName: 'García' }]);
}

describe('buildAuditLogWhere', () => {
  test('leaves password changes, metrics and topics out by default', () => {
    expect(buildAuditLogWhere(parseAuditLogFilters({}))).toMatchObject({
      action: LISTED_ACTIONS,
      entity: LISTED_ENTITIES,
    });
  });

  test('keeps user updates only when they change the status', () => {
    expect(buildAuditLogWhere(parseAuditLogFilters({})).OR).toEqual([
      { NOT: { entity: 'user', action: 'update' } },
      { details: { path: ['changes'], array_contains: [{ field: 'status' }] } },
    ]);
  });

  test('filters by action, entity and author', () => {
    expect(
      buildAuditLogWhere(
        parseAuditLogFilters({ action: 'deletion', entity: 'project', authorId: '3' })
      )
    ).toMatchObject({ action: 'deletion', entity: 'project', authorId: 3 });
  });

  test('covers whole days in the Montevideo timezone', () => {
    expect(
      buildAuditLogWhere(parseAuditLogFilters({ from: '2026-10-01', to: '2026-10-21' }))
    ).toMatchObject({
      occurredAt: {
        gte: new Date('2026-10-01T03:00:00.000Z'),
        lte: new Date('2026-10-22T02:59:59.999Z'),
      },
    });
  });

  test('supports an open-ended range', () => {
    expect(buildAuditLogWhere(parseAuditLogFilters({ from: '2026-10-01' }))).toMatchObject({
      occurredAt: { gte: new Date('2026-10-01T03:00:00.000Z'), lte: undefined },
    });
  });
});

describe('listAuditLog', () => {
  test('pages the entries newest first', async () => {
    prismaMock.auditLog.count.mockResolvedValue(45);
    prismaMock.auditLog.findMany.mockResolvedValue([]);
    mockEntityLookups();

    const result = await listAuditLog(parseAuditLogFilters({ page: '2' }));

    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        skip: 20,
        take: 20,
      })
    );
    expect(result).toMatchObject({ total: 45, page: 2, pageSize: 20, totalPages: 3 });
  });

  test('clamps a page beyond the last one', async () => {
    prismaMock.auditLog.count.mockResolvedValue(45);
    prismaMock.auditLog.findMany.mockResolvedValue([]);
    mockEntityLookups();

    const result = await listAuditLog(parseAuditLogFilters({ page: '9' }));

    expect(result.page).toBe(3);
    expect(prismaMock.auditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 40 })
    );
  });

  test('skips the entries query when there are no results', async () => {
    prismaMock.auditLog.count.mockResolvedValue(0);
    mockEntityLookups();

    const result = await listAuditLog(parseAuditLogFilters({}));

    expect(prismaMock.auditLog.findMany).not.toHaveBeenCalled();
    expect(result).toEqual({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 });
  });

  test('resolves the name of each affected record', async () => {
    prismaMock.auditLog.count.mockResolvedValue(4);
    prismaMock.auditLog.findMany.mockResolvedValue([
      row(1, 'project', 12),
      row(2, 'beneficiary', 5),
      row(3, 'user', 8),
      row(4, 'project', 99),
    ]);
    mockEntityLookups();

    const { items } = await listAuditLog(parseAuditLogFilters({}));

    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: { in: [12, 99] } } })
    );
    expect(items.map((item) => item.entityName)).toEqual([
      'Huerta Cerro Norte',
      'Merendero Las Acacias (2026)',
      'Ana García',
      null,
    ]);
  });
  test('summarizes the details and skips category labels when there are no beneficiaries', async () => {
    getBeneficiaryCategoryLabels.mockClear();
    prismaMock.auditLog.count.mockResolvedValue(1);
    prismaMock.auditLog.findMany.mockResolvedValue([
      row(1, 'user', 8, { changes: [{ field: 'status', from: 'active', to: 'disabled' }] }),
    ]);
    mockEntityLookups();

    const { items } = await listAuditLog(parseAuditLogFilters({}));

    expect(items[0]).not.toHaveProperty('details');
    expect(items[0].summary).toBe('Estado: Activo → Deshabilitado');
    expect(getBeneficiaryCategoryLabels).not.toHaveBeenCalled();
  });

  test('names beneficiary categories in the summary', async () => {
    prismaMock.auditLog.count.mockResolvedValue(1);
    prismaMock.auditLog.findMany.mockResolvedValue([
      row(1, 'beneficiary', 5, { year: 2026, changes: [{ field: 'families', from: 30, to: 34 }] }),
    ]);
    mockEntityLookups();

    const { items } = await listAuditLog(parseAuditLogFilters({}));

    expect(items[0].summary).toBe('Año 2026 · Familias: 30 → 34');
  });
});
