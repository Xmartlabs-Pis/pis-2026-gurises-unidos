'use client';

import { useRef } from 'react';
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
import type { AuditLogFilters } from '@/lib/validation/audit-log-filters';

const FILTER_KEYS: (keyof AuditLogFilters)[] = ['entity', 'authorId', 'from', 'to'];

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

  function commitDate(key: 'from' | 'to', value: string) {
    if (value !== (filters[key] ?? '')) updateFilters({ [key]: value || null });
  }

  function commitPendingDates() {
    for (const key of ['from', 'to'] as const) {
      const input = dateInputRefs[key].current;
      if (input) commitDate(key, input.value);
    }
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
      <div className="flex items-center gap-3">
        <Tabs
          value={filters.action ?? ALL_FILTER_VALUE}
          onValueChange={(value) =>
            updateFilters({ action: value === ALL_FILTER_VALUE ? null : String(value) })
          }
        >
          <div className="bg-secondary flex h-9 w-fit flex-row items-center rounded-lg px-0.5 py-0.75">
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
          if (!open) commitPendingDates();
        }}
      >
        <PopoverTrigger
          render={<Button variant="outline" className="relative h-9 w-fit gap-2" />}
          aria-description={`${activeFilterCount} filtros activos`}
        >
          <ListFilter />
          Filtros
          {activeFilterCount > 0 && (
            <span
              aria-hidden="true"
              className="bg-primary text-primary-foreground absolute -top-1.5 -right-1.5 flex size-4 items-center justify-center rounded-full text-[10px] font-semibold"
            >
              {activeFilterCount}
            </span>
          )}
        </PopoverTrigger>
        <PopoverContent align="end" className="w-72 gap-4 p-4">
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
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { key: 'from', label: 'Desde', value: filters.from },
                { key: 'to', label: 'Hasta', value: filters.to },
              ] as const
            ).map(({ key, label, value }) => (
              <label key={key} className="flex flex-col gap-2">
                <span>{label}</span>
                <Input
                  key={value}
                  ref={dateInputRefs[key]}
                  type="date"
                  defaultValue={value ?? ''}
                  onBlur={(event) => commitDate(key, event.currentTarget.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') commitDate(key, event.currentTarget.value);
                  }}
                />
              </label>
            ))}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => clearFilters(FILTER_KEYS)}
          >
            Limpiar filtros
          </Button>
        </PopoverContent>
      </Popover>
    </div>
  );
}
