import { AuditLogPagination } from '@/components/audit-log/audit-log-pagination';
import { AuditLogTable } from '@/components/audit-log/audit-log-table';
import { AuditLogToolbar } from '@/components/audit-log/audit-log-toolbar';
import { PageHeader } from '@/components/layout/page-header';
import { requireAdmin } from '@/lib/auth/require-admin';
import { listAuditLog, listAuditLogAuthors } from '@/lib/audit-log/list';
import { redirectToCanonical, type RawSearchParams } from '@/lib/url-filters';
import { parseAuditLogFilters, toCanonicalAuditLogQuery } from '@/lib/validation/audit-log-filters';

export default async function AuditHistoryPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  await requireAdmin();

  const rawParams = await searchParams;
  const filters = parseAuditLogFilters(rawParams);
  redirectToCanonical('/management/history', rawParams, toCanonicalAuditLogQuery(filters));
  const [auditLog, authors] = await Promise.all([listAuditLog(filters), listAuditLogAuthors()]);

  return (
    <div className="bg-primary-foreground flex w-full flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-296 flex-1 flex-col">
        <div className="flex w-full shrink-0 flex-col px-4 pt-6 pb-2.5 sm:px-6">
          <PageHeader
            eyebrow="Administración"
            title="Historial de cambios"
            description="Cambios en los datos del sistema e intentos fallidos de acceso, con su fecha y hora."
          />
        </div>

        <div className="flex w-full flex-1 flex-col gap-5 px-4 pt-6 pb-8 sm:px-6">
          <AuditLogToolbar filters={filters} total={auditLog.total} authors={authors} />
          <AuditLogTable entries={auditLog.items} />
          <AuditLogPagination
            page={auditLog.page}
            pageSize={auditLog.pageSize}
            total={auditLog.total}
            totalPages={auditLog.totalPages}
          />
        </div>
      </div>
    </div>
  );
}
