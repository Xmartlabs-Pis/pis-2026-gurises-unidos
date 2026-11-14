'use client';

import { useRef, useState } from 'react';
import { ListFilter } from 'lucide-react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { AUDIT_ACTION_TABS, AUDIT_ENTITY_LABELS } from '@/lib/audit-log/constants';
import { formatAuditLogCount } from '@/lib/audit-log/format';
import { ALL_FILTER_VALUE } from '@/lib/url-filters';
import { fullName } from '@/lib/users/format';
import {
  AUDIT_LOG_MAX_DATE,
  auditLogDateSchema,
  type AuditLogFilters,
} from '@/lib/validation/audit-log-filters';
import { normalizeDocumentId } from '@/lib/utils';

const FILTER_KEYS: (keyof AuditLogFilters)[] = ['entity', 'authorId', 'documentId', 'from', 'to'];

type AuditLogToolbarProps = {
  filters: AuditLogFilters;
  total: number;
  authors: { id: number; firstName: string; lastName: string }[];
};

export function AuditLogToolbar({ filters, total, authors }: AuditLogToolbarProps) {
  const { updateFilters, clearFilters } = useUrlFilters({ resetKeys: ['page'] });

  const activeFilterCount = FILTER_KEYS.filter((key) => filters[key] !== undefined).length;

  const dateInputRefs = {
    from: useRef<HTMLInputElement>(null),
    to: useRef<HTMLInputElement>(null),
  };
  const documentIdInputRef = useRef<HTMLInputElement>(null);
  const [dateDrafts, setDateDrafts] = useState({ from: filters.from ?? '', to: filters.to ?? '' });
  const [appliedDates, setAppliedDates] = useState({ from: filters.from, to: filters.to });
  const [dateErrors, setDateErrors] = useState<Partial<Record<'from' | 'to', string>>>({});
  if (appliedDates.from !== filters.from || appliedDates.to !== filters.to) {
    setDateDrafts((drafts) => ({
      from: appliedDates.from !== filters.from ? (filters.from ?? '') : drafts.from,
      to: appliedDates.to !== filters.to ? (filters.to ?? '') : drafts.to,
    }));
    setAppliedDates({ from: filters.from, to: filters.to });
  }

  function commitDocumentId(value: string) {
    const documentId = normalizeDocumentId(value.trim());
    if (documentId !== (filters.documentId ?? '')) {
      updateFilters({ documentId: documentId || null });
    }
  }

  function commitDate(key: 'from' | 'to', value: string) {
    const error = value ? auditLogDateSchema.safeParse(value).error?.issues[0]?.message : undefined;
    setDateErrors((errors) => ({ ...errors, [key]: error }));
    if (error) return;
    if (value !== (filters[key] ?? '')) updateFilters({ [key]: value || null });
  }

  function commitPendingFilters() {
    for (const key of ['from', 'to'] as const) {
      const input = dateInputRefs[key].current;
      if (input) commitDate(key, input.value);
    }
    const documentIdInput = documentIdInputRef.current;
    if (documentIdInput) commitDocumentId(documentIdInput.value);
  }

  const entityOptions = [
    { value: ALL_FILTER_VALUE, label: 'Todas' },
    ...Object.entries(AUDIT_ENTITY_LABELS).map(([value, label]) => ({ value, label })),
  ];
  const authorOptions = [
    { value: ALL_FILTER_VALUE, label: 'Todos' },
    ...authors.map((author) => ({ value: String(author.id), label: fullName(author) })),
  ];

  const selectFilters = [
    {
      key: 'entity',
      label: 'Entidad',
      options: entityOptions,
      value: filters.entity ?? ALL_FILTER_VALUE,
    },
    {
      key: 'authorId',
      label: 'Autor',
      options: authorOptions,
      value: filters.authorId?.toString() ?? ALL_FILTER_VALUE,
    },
  ];

  return (
    <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-center gap-3">
        <Tabs
          className="min-w-0"
          value={filters.action ?? ALL_FILTER_VALUE}
          onValueChange={(value) =>
            updateFilters({ action: value === ALL_FILTER_VALUE ? null : String(value) })
          }
        >
          <div className="bg-secondary flex h-9 max-w-full [scrollbar-width:none] flex-row items-center overflow-x-auto overflow-y-hidden rounded-lg px-0.5 py-0.75">
            <TabsList aria-label="Filtrar por acción">
              {AUDIT_ACTION_TABS.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    'text-muted-foreground h-7.25 cursor-pointer gap-2.5 rounded-md px-2 py-1 text-sm font-medium',
                    'data-active:bg-card data-active:text-primary data-active:border-border data-active:shadow-sm/10'
                  )}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </Tabs>
        <p className="text-muted-foreground hidden text-sm leading-5 md:block">
          {formatAuditLogCount(total)}
        </p>
      </div>

      <Popover
        onOpenChange={(open) => {
          if (!open) commitPendingFilters();
        }}
      >
        <PopoverTrigger
          render={<Button variant="outline" size="icon" className="relative h-9 w-9 shrink-0" />}
          aria-label="Filtros del historial"
          aria-description={`${activeFilterCount} ${activeFilterCount === 1 ? 'filtro activo' : 'filtros activos'}`}
        >
          <ListFilter />
          {activeFilterCount > 0 && (
            <span
              aria-hidden="true"
              className="bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold"
            >
              {activeFilterCount}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 max-w-[calc(100vw-2rem)] gap-4 p-4">
          <label className="flex flex-col gap-2">
            <span>Cédula ingresada</span>
            <Input
              key={filters.documentId}
              ref={documentIdInputRef}
              defaultValue={filters.documentId ?? ''}
              placeholder="Ej.: 1.234.567-2"
              onBlur={(event) => commitDocumentId(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') commitDocumentId(event.currentTarget.value);
              }}
            />
          </label>
          {selectFilters.map(({ key, label, options, value }) => (
            <div key={key} className="flex flex-col gap-2">
              <span>{label}</span>
              <Select
                items={options}
                value={value}
                onValueChange={(selected) =>
                  updateFilters({ [key]: selected === ALL_FILTER_VALUE ? null : selected })
                }
              >
                <SelectTrigger aria-label={`Filtrar por ${label.toLowerCase()}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  alignItemWithTrigger={false}
                  className="max-h-[min(15rem,var(--available-height))]"
                >
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <div className="grid min-w-0 grid-cols-1 gap-4">
            {(
              [
                { key: 'from', label: 'Desde' },
                { key: 'to', label: 'Hasta' },
              ] as const
            ).map(({ key, label }) => (
              <div key={key} className="flex min-w-0 flex-col gap-2">
                <label htmlFor={`audit-date-${key}`}>{label}</label>
                <Input
                  id={`audit-date-${key}`}
                  ref={dateInputRefs[key]}
                  type="date"
                  max={AUDIT_LOG_MAX_DATE}
                  className="max-w-full min-w-0"
                  value={dateDrafts[key]}
                  aria-invalid={Boolean(dateErrors[key])}
                  aria-describedby={dateErrors[key] ? `audit-date-${key}-error` : undefined}
                  onChange={(event) => {
                    const value = event.currentTarget.value;
                    setDateDrafts((drafts) => ({ ...drafts, [key]: value }));
                    setDateErrors((errors) => ({ ...errors, [key]: undefined }));
                  }}
                  onBlur={(event) => commitDate(key, event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitDate(key, event.currentTarget.value);
                  }}
                />
                {dateErrors[key] && (
                  <span
                    id={`audit-date-${key}-error`}
                    role="alert"
                    className="text-destructive text-xs"
                  >
                    {dateErrors[key]}
                  </span>
                )}
              </div>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => {
              setDateDrafts({ from: '', to: '' });
              setDateErrors({});
              clearFilters(FILTER_KEYS);
            }}
          >
            Limpiar filtros
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
