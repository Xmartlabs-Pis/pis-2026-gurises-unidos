'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { PAGE_GAP, pageNumbers } from '@/lib/audit-log/format';
import {
  AUDIT_LOG_DEFAULT_PAGE_SIZE,
  AUDIT_LOG_PAGE_SIZES,
} from '@/lib/validation/audit-log-filters';

type AuditLogPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function AuditLogPagination({ page, pageSize, total, totalPages }: AuditLogPaginationProps) {
  const { updateFilters, isPending } = useUrlFilters();

  if (total === 0) return null;

  const goTo = (target: number) => updateFilters({ page: target === 1 ? null : String(target) });
  const first = (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label="Paginación del historial"
      className="text-muted-foreground flex flex-col items-center gap-3 text-sm sm:flex-row sm:justify-between"
    >
      <p className="tabular-nums">
        Mostrando {first}–{last} de {total}
      </p>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Página anterior"
          disabled={page === 1 || isPending}
          onClick={() => goTo(page - 1)}
        >
          <ChevronLeft />
        </Button>
        {pageNumbers(page, totalPages).map((item, index) =>
          item === PAGE_GAP ? (
            <span key={`${PAGE_GAP}-${index}`} className="px-1">
              …
            </span>
          ) : (
            <Button
              key={item}
              variant={item === page ? 'outline' : 'ghost'}
              size="icon"
              aria-current={item === page ? 'page' : undefined}
              disabled={isPending}
              className="tabular-nums"
              onClick={() => goTo(item)}
            >
              {item}
            </Button>
          )
        )}
        <Button
          variant="ghost"
          size="icon"
          aria-label="Página siguiente"
          disabled={page === totalPages || isPending}
          onClick={() => goTo(page + 1)}
        >
          <ChevronRight />
        </Button>
      </div>

      <label className="flex items-center gap-2">
        Por página
        <Select
          value={String(pageSize)}
          onValueChange={(value) =>
            updateFilters({
              page: null,
              pageSize: Number(value) === AUDIT_LOG_DEFAULT_PAGE_SIZE ? null : String(value),
            })
          }
        >
          <SelectTrigger aria-label="Registros por página" className="w-20">
            <SelectValue />
          </SelectTrigger>
          <SelectContent alignItemWithTrigger={false}>
            {AUDIT_LOG_PAGE_SIZES.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    </nav>
  );
}
