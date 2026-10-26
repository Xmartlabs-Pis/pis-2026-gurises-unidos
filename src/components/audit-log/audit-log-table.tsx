import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  AUDIT_ACTION_CLASSNAMES,
  AUDIT_ACTION_LABELS,
  AUDIT_ENTITY_LABELS,
} from '@/lib/audit-log/constants';
import { auditEntityName, formatAuditTime } from '@/lib/audit-log/format';
import type { AuditLogListItem } from '@/lib/audit-log/list';
import { ROLE_LABELS } from '@/lib/users/constants';
import { formatDate, fullName } from '@/lib/users/format';

const EMPTY_MESSAGE = 'No hay cambios registrados con estos filtros';

function ActionBadge({ action }: Pick<AuditLogListItem, 'action'>) {
  return <Badge className={AUDIT_ACTION_CLASSNAMES[action]}>{AUDIT_ACTION_LABELS[action]}</Badge>;
}

export function AuditLogTable({ entries }: { entries: AuditLogListItem[] }) {
  return (
    <>
      <div className="flex flex-col gap-3 xl:hidden">
        {entries.length === 0 && (
          <p className="text-muted-foreground rounded-[14px] border py-12 text-center">
            {EMPTY_MESSAGE}
          </p>
        )}
        {entries.map((entry) => (
          <Card key={entry.id} className="shrink-0 gap-3 py-4">
            <CardContent className="flex items-center justify-between gap-3 px-4">
              <ActionBadge action={entry.action} />
              <time
                dateTime={entry.occurredAt.toISOString()}
                className="text-muted-foreground text-sm tabular-nums"
              >
                {formatDate(entry.occurredAt)} {formatAuditTime(entry.occurredAt)}
              </time>
            </CardContent>
            <CardContent className="min-w-0 px-4">
              <p className="text-muted-foreground text-sm">{AUDIT_ENTITY_LABELS[entry.entity]}</p>
              <p className="text-foreground truncate font-medium">{auditEntityName(entry)}</p>
              {entry.summary && (
                <p className="text-muted-foreground text-sm break-words">{entry.summary}</p>
              )}
              <p className="text-muted-foreground mt-1 truncate text-sm">
                {fullName(entry.author)} · {ROLE_LABELS[entry.author.role]}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="hidden min-h-0 w-full flex-1 overflow-auto rounded-[14px] border xl:block xl:max-h-fit [&_[data-slot=table-container]]:overflow-visible">
        <Table className="table-fixed">
          <TableHeader className="[&_th]:bg-muted [&_th]:sticky [&_th]:top-0 [&_th]:z-10 [&_th]:shadow-[inset_0_-1px_0_0_var(--border)] [&_tr]:border-b-0">
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-muted-foreground h-10 w-40 px-4 py-2.5">
                Fecha y hora
              </TableHead>
              <TableHead className="text-muted-foreground h-10 w-56 px-4 py-2.5">Autor</TableHead>
              <TableHead className="text-muted-foreground h-10 w-44 px-4 py-2.5">Acción</TableHead>
              <TableHead className="text-muted-foreground h-10 px-4 py-2.5">
                Registro afectado
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={4} className="text-muted-foreground h-120 text-center">
                  {EMPTY_MESSAGE}
                </TableCell>
              </TableRow>
            )}
            {entries.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell className="h-15 px-4 py-3 tabular-nums">
                  <time dateTime={entry.occurredAt.toISOString()} className="flex flex-col">
                    <span className="text-foreground">{formatDate(entry.occurredAt)}</span>
                    <span className="text-muted-foreground text-xs">
                      {formatAuditTime(entry.occurredAt)}
                    </span>
                  </time>
                </TableCell>
                <TableCell className="h-15 px-4 py-3">
                  <p className="text-foreground truncate font-medium">{fullName(entry.author)}</p>
                  <p className="text-muted-foreground text-xs">{ROLE_LABELS[entry.author.role]}</p>
                </TableCell>
                <TableCell className="h-15 px-4 py-3">
                  <ActionBadge action={entry.action} />
                </TableCell>
                <TableCell className="h-15 px-4 py-3">
                  <p className="text-muted-foreground text-xs">
                    {AUDIT_ENTITY_LABELS[entry.entity]}
                  </p>
                  <p className="text-foreground truncate font-medium">{auditEntityName(entry)}</p>
                  {entry.summary && (
                    <p className="text-muted-foreground text-xs break-words whitespace-normal">
                      {entry.summary}
                    </p>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
