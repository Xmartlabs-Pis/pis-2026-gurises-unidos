import { z } from 'zod';
import type { Prisma } from '@/generated/prisma/client';
import {
  COVER_CHANGE_FIELDS,
  COVER_PHOTO_UPDATE_DETAIL,
  COVER_PHOTO_UPDATE_LABEL,
  PROJECT_FIELD_LABELS,
  PROJECT_TEXT_CHANGE_LABELS,
  PUBLIC_VIEW_FIELD_LABELS,
} from '@/lib/audit-log/constants';
import { formatAuditValue, PROJECT_VALUE_LABELS } from '@/lib/audit-log/format';
import {
  loginFailureDetailsSchema,
  LOGIN_FAILURE_REASON_LABELS,
} from '@/lib/audit-log/login-failure';
import { ROLE_LABELS, STATUS_LABELS } from '@/lib/users/constants';
import type { ListedAuditAction, ListedAuditEntity } from '@/lib/validation/audit-log-filters';

const auditDetailsSchema = z
  .object({
    year: z.number().optional(),
    values: z.record(z.string(), z.number()).optional(),
    changes: z
      .array(z.object({ field: z.string(), from: z.unknown(), to: z.unknown() }))
      .optional(),
    changedFields: z.array(z.string()).optional(),
    restored: z.boolean().optional(),
    order: z.object({ from: z.array(z.string()), to: z.array(z.string()) }).optional(),
    previousName: z.string().optional(),
    name: z.string().optional(),
  })
  .catch({});

type AuditChange = { field: string; from: unknown; to: unknown };

const PUBLIC_VIEW_ENTITIES = new Set<ListedAuditEntity>([
  'publicSettings',
  'metric',
  'topic',
  'contributor',
]);

const USER_FIELD_LABELS: Record<string, string> = { status: 'Estado', role: 'Rol' };

const USER_VALUE_LABELS: Record<string, Record<string, string>> = {
  status: STATUS_LABELS,
  role: ROLE_LABELS,
};

function formatChanges(
  changes: AuditChange[],
  fieldLabels: Record<string, string>,
  valueLabels: Record<string, Record<string, string>> = {},
  changeLabels: Record<string, string> = {}
) {
  return changes
    .map(({ field, from, to }) => {
      const fieldLabel = fieldLabels[field] ?? field;
      const changeLabel = changeLabels[field];

      if (typeof changeLabel === 'string') return `${fieldLabel}: ${changeLabel}`;

      return `${fieldLabel}: ${formatAuditValue(field, from, valueLabels)} → ${formatAuditValue(field, to, valueLabels)}`;
    })
    .join(', ');
}

function describeProjectChanges(changes: AuditChange[]) {
  const otherChanges = changes.filter((change) => !COVER_CHANGE_FIELDS.has(change.field));
  const coverUpdated = otherChanges.length !== changes.length;
  const formatted = formatChanges(
    otherChanges,
    PROJECT_FIELD_LABELS,
    PROJECT_VALUE_LABELS,
    PROJECT_TEXT_CHANGE_LABELS
  );
  if (!coverUpdated) return formatted;
  if (otherChanges.length === 0) return COVER_PHOTO_UPDATE_LABEL;
  return `${formatted}, ${COVER_PHOTO_UPDATE_DETAIL}`;
}

function formatBeneficiaryTotal(total: number) {
  return total === 1 ? '1 beneficiario' : `${total} beneficiarios`;
}

function describeBeneficiary(
  action: ListedAuditAction,
  { year, values, changes = [] }: z.infer<typeof auditDetailsSchema>,
  categoryLabels: Record<string, string>
) {
  if (year === undefined) return null;
  if (action === 'creation') {
    const counts = values ? Object.values(values) : changes.map(({ to }) => Number(to) || 0);
    const total = counts.reduce((sum, count) => sum + count, 0);
    return `Año ${year} · ${formatBeneficiaryTotal(total)}`;
  }
  return changes.length ? `Año ${year} · ${formatChanges(changes, categoryLabels)}` : null;
}

export function describeAuditDetails(
  entry: { action: ListedAuditAction; entity: ListedAuditEntity; details: Prisma.JsonValue },
  categoryLabels: Record<string, string>
) {
  if (entry.action === 'loginFailure') {
    const parsed = loginFailureDetailsSchema.safeParse(entry.details);
    return parsed.success ? LOGIN_FAILURE_REASON_LABELS[parsed.data.reason] : null;
  }
  const details = auditDetailsSchema.parse(entry.details ?? {});

  if (entry.entity === 'beneficiary') {
    return describeBeneficiary(entry.action, details, categoryLabels);
  }
  if (entry.entity === 'user') {
    if (details.restored) return 'Usuario restaurado';
    return details.changes?.length
      ? formatChanges(details.changes, USER_FIELD_LABELS, USER_VALUE_LABELS)
      : null;
  }
  if (PUBLIC_VIEW_ENTITIES.has(entry.entity)) {
    if (details.previousName !== undefined && details.name !== undefined) {
      return `Nombre: ${details.previousName} → ${details.name}`;
    }
    if (details.order) {
      return `{${details.order.from.join(', ')}} → {${details.order.to.join(', ')}}`;
    }
    return details.changes?.length
      ? formatChanges(details.changes, PUBLIC_VIEW_FIELD_LABELS)
      : null;
  }
  if (details.changes?.length) {
    return describeProjectChanges(details.changes);
  }
  if (details.changedFields?.length) {
    const fields = details.changedFields.map((field) => PROJECT_FIELD_LABELS[field] ?? field);
    return `Cambió: ${fields.join(', ')}`;
  }
  return null;
}
