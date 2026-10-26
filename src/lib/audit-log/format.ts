import { AUDIT_ENTITY_LABELS } from '@/lib/audit-log/constants';
import type { AuditLogListItem } from '@/lib/audit-log/list';

export function formatAuditTime(date: Date) {
  return new Date(date).toLocaleTimeString('es-UY', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Montevideo',
  });
}

export function auditEntityName({
  entity,
  entityId,
  entityName,
}: Pick<AuditLogListItem, 'entity' | 'entityId' | 'entityName'>) {
  return entityName ?? `${AUDIT_ENTITY_LABELS[entity]} #${entityId}`;
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
