import { AUDIT_ENTITY_LABELS } from '@/lib/audit-log/constants';
import type { AuditLogListItem } from '@/lib/audit-log/list';
import {
  COUNTERPARTY_LABEL,
  GEOGRAPHIC_SCOPE_OPTIONS,
  INTENSITY_LABEL,
  STATUS_LABEL,
  ZONE_OPTIONS,
} from '@/lib/project-display';

export function formatAuditTime(date: Date) {
  return new Date(date).toLocaleTimeString('es-UY', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'America/Montevideo',
  });
}

export function auditEntityName({
  entity,
  entityId,
  entityName,
}: Pick<AuditLogListItem, 'entity' | 'entityId' | 'entityName'>) {
  return (
    entityName ??
    (entityId === null
      ? AUDIT_ENTITY_LABELS[entity]
      : `${AUDIT_ENTITY_LABELS[entity]} #${entityId}`)
  );
}

export const PAGE_GAP = 'gap';

export function pageNumbers(page: number, totalPages: number): (number | typeof PAGE_GAP)[] {
  const pages: (number | typeof PAGE_GAP)[] = [];
  for (let current = 1; current <= totalPages; current++) {
    const isEdge = current === 1 || current === totalPages;
    if (isEdge || Math.abs(current - page) <= 1) pages.push(current);
    else if (pages.at(-1) !== PAGE_GAP) pages.push(PAGE_GAP);
  }
  return pages;
}

export function formatAuditLogCount(count: number) {
  if (count === 0) return 'No hay resultados';
  if (count === 1) return '1 registro';
  return `${count} registros`;
}

export const PROJECT_VALUE_LABELS: Record<string, Record<string, string>> = {
  status: STATUS_LABEL,
  intensity: INTENSITY_LABEL,
  counterpartyType: COUNTERPARTY_LABEL,
  geographicScope: Object.fromEntries(
    GEOGRAPHIC_SCOPE_OPTIONS.map(({ value, label }) => [value, label])
  ),
  zone: Object.fromEntries(ZONE_OPTIONS.map(({ value, label }) => [value, label])),
};

export function formatAuditValue(
  field: string,
  value: unknown,
  valueLabels: Record<string, Record<string, string>> = {}
): string {
  if (value === null || value === undefined || value === '') return 'Sin datos';

  if (typeof value === 'boolean') return value ? 'Sí' : 'No';

  if (Array.isArray(value)) {
    return value.length
      ? value.map((item) => formatAuditValue(field, item, valueLabels)).join(', ')
      : 'Sin datos';
  }

  if (typeof value === 'object') {
    return 'name' in value && typeof value.name === 'string' && value.name
      ? value.name
      : 'Sin datos';
  }

  const label = valueLabels[field]?.[String(value)];

  return typeof label === 'string' ? label : String(value);
}
