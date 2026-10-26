import prisma from '@/lib/prisma';
import type { Prisma } from '@/generated/prisma/client';
import { describeAuditDetails } from '@/lib/audit-log/summary';
import { getBeneficiaryCategoryLabels } from '@/lib/beneficiary-categories';
import {
  LISTED_AUDIT_ACTIONS,
  LISTED_AUDIT_ENTITIES,
  type AuditLogFilters,
  type ListedAuditAction,
  type ListedAuditEntity,
} from '@/lib/validation/audit-log-filters';

const MONTEVIDEO_OFFSET = '-03:00';

const AUDIT_LOG_LIST_SELECT = {
  id: true,
  action: true,
  entity: true,
  entityId: true,
  details: true,
  occurredAt: true,
  author: { select: { id: true, firstName: true, lastName: true, role: true } },
} satisfies Prisma.AuditLogSelect;

type AuditLogRow = Prisma.AuditLogGetPayload<{ select: typeof AUDIT_LOG_LIST_SELECT }>;

type ListedAuditLogRow = Omit<AuditLogRow, 'action' | 'entity'> & {
  action: ListedAuditAction;
  entity: ListedAuditEntity;
};

export type AuditLogListItem = Omit<ListedAuditLogRow, 'details'> & {
  entityName: string | null;
  summary: string | null;
};

const LISTED_ACTIONS_WHERE = { in: [...LISTED_AUDIT_ACTIONS] };
const LISTED_ENTITIES_WHERE = { in: [...LISTED_AUDIT_ENTITIES] };

const ONLY_USER_STATUS_AND_ROLE_UPDATES: Prisma.AuditLogWhereInput[] = [
  { NOT: { entity: 'user', action: 'update' } },
  { details: { path: ['changes'], array_contains: [{ field: 'status' }] } },
  { details: { path: ['changes'], array_contains: [{ field: 'role' }] } },
];

export type AuditLogPage = {
  items: AuditLogListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function buildAuditLogWhere(filters: AuditLogFilters): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {
    action: filters.action ?? LISTED_ACTIONS_WHERE,
    entity: filters.entity ?? LISTED_ENTITIES_WHERE,
    OR: ONLY_USER_STATUS_AND_ROLE_UPDATES,
  };

  if (filters.authorId) {
    where.authorId = filters.authorId;
  }
  if (filters.from || filters.to) {
    where.occurredAt = {
      gte: filters.from ? new Date(`${filters.from}T00:00:00.000${MONTEVIDEO_OFFSET}`) : undefined,
      lte: filters.to ? new Date(`${filters.to}T23:59:59.999${MONTEVIDEO_OFFSET}`) : undefined,
    };
  }

  return where;
}

function idsOf(rows: ListedAuditLogRow[], entity: ListedAuditEntity) {
  return [...new Set(rows.filter((row) => row.entity === entity).map((row) => row.entityId))];
}

async function resolveEntityNames(rows: ListedAuditLogRow[]) {
  const [projects, beneficiaries, users] = await Promise.all([
    prisma.project.findMany({
      where: { id: { in: idsOf(rows, 'project') } },
      select: { id: true, name: true },
    }),
    prisma.projectBeneficiary.findMany({
      where: { id: { in: idsOf(rows, 'beneficiary') } },
      select: { id: true, year: true, project: { select: { name: true } } },
    }),
    prisma.user.findMany({
      where: { id: { in: idsOf(rows, 'user') } },
      select: { id: true, firstName: true, lastName: true },
    }),
  ]);

  const names: Record<ListedAuditEntity, Map<number, string>> = {
    project: new Map(projects.map(({ id, name }) => [id, name])),
    beneficiary: new Map(
      beneficiaries.map(({ id, year, project }) => [id, `${project.name} (${year})`])
    ),
    user: new Map(users.map(({ id, firstName, lastName }) => [id, `${firstName} ${lastName}`])),
  };

  return (row: Pick<ListedAuditLogRow, 'entity' | 'entityId'>) =>
    names[row.entity].get(row.entityId) ?? null;
}

export async function listAuditLog(filters: AuditLogFilters): Promise<AuditLogPage> {
  const where = buildAuditLogWhere(filters);
  const total = await prisma.auditLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const page = Math.min(filters.page, totalPages);

  const rows =
    total === 0
      ? []
      : await prisma.auditLog.findMany({
          where,
          select: AUDIT_LOG_LIST_SELECT,
          orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * filters.pageSize,
          take: filters.pageSize,
        });
  const listedRows = rows.map((row) => ({
    ...row,
    action: row.action as ListedAuditAction,
    entity: row.entity as ListedAuditEntity,
  }));
  const [entityNameOf, categoryLabels] = await Promise.all([
    resolveEntityNames(listedRows),
    listedRows.some((row) => row.entity === 'beneficiary') ? getBeneficiaryCategoryLabels() : {},
  ]);

  return {
    items: listedRows.map(({ details, ...row }) => ({
      ...row,
      entityName: entityNameOf(row),
      summary: describeAuditDetails({ ...row, details }, categoryLabels),
    })),
    total,
    page,
    pageSize: filters.pageSize,
    totalPages,
  };
}

export async function listAuditLogAuthors() {
  return prisma.user.findMany({
    where: {
      auditLogs: {
        some: {
          action: LISTED_ACTIONS_WHERE,
          entity: LISTED_ENTITIES_WHERE,
          OR: ONLY_USER_STATUS_AND_ROLE_UPDATES,
        },
      },
    },
    select: { id: true, firstName: true, lastName: true },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { id: 'asc' }],
  });
}
