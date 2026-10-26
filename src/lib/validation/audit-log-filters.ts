import { z } from 'zod';
import { toSingleValues, type CanonicalQuery, type RawSearchParams } from '@/lib/url-filters';
import { parseId } from '@/lib/validation/ids';

export const AUDIT_LOG_PAGE_SIZES = [20, 50, 100] as const;
export const AUDIT_LOG_DEFAULT_PAGE_SIZE = AUDIT_LOG_PAGE_SIZES[0];
export const LISTED_AUDIT_ACTIONS = ['creation', 'update', 'deletion'] as const;
export const LISTED_AUDIT_ENTITIES = ['project', 'beneficiary', 'user'] as const;

export type ListedAuditAction = (typeof LISTED_AUDIT_ACTIONS)[number];
export type ListedAuditEntity = (typeof LISTED_AUDIT_ENTITIES)[number];

const optionalDate = z.iso.date().optional().catch(undefined);

export const auditLogFiltersSchema = z
  .object({
    action: z.enum(LISTED_AUDIT_ACTIONS).optional().catch(undefined),
    entity: z.enum(LISTED_AUDIT_ENTITIES).optional().catch(undefined),
    authorId: z
      .unknown()
      .transform((value) => parseId(value) ?? undefined)
      .optional(),
    from: optionalDate,
    to: optionalDate,
    page: z.coerce.number().int().positive().catch(1),
    pageSize: z.coerce
      .number()
      .pipe(z.union(AUDIT_LOG_PAGE_SIZES.map((size) => z.literal(size))))
      .catch(AUDIT_LOG_DEFAULT_PAGE_SIZE),
  })
  .transform((filters) => {
    if (filters.from && filters.to && filters.from > filters.to) {
      return { ...filters, from: filters.to, to: filters.from };
    }

    return filters;
  });

export type AuditLogFilters = z.infer<typeof auditLogFiltersSchema>;

export function parseAuditLogFilters(raw: RawSearchParams): AuditLogFilters {
  return auditLogFiltersSchema.parse(toSingleValues(raw));
}

export function toCanonicalAuditLogQuery(filters: AuditLogFilters): CanonicalQuery {
  return {
    action: filters.action,
    entity: filters.entity,
    authorId: filters.authorId,
    from: filters.from,
    to: filters.to,
    page: filters.page === 1 ? undefined : filters.page,
    pageSize: filters.pageSize === AUDIT_LOG_DEFAULT_PAGE_SIZE ? undefined : filters.pageSize,
  };
}
