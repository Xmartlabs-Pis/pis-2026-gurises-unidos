'use client';

import { useState, useSyncExternalStore } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';

const YEARS_MEDIA_QUERY = '(min-width: 640px)';
const ROWS_PER_PAGE = 2;

function subscribeToColumns(onChange: () => void) {
  const query = window.matchMedia?.(YEARS_MEDIA_QUERY);
  query?.addEventListener('change', onChange);
  return () => query?.removeEventListener('change', onChange);
}

function getColumns() {
  return window.matchMedia?.(YEARS_MEDIA_QUERY).matches === false ? 2 : 3;
}

function getServerColumns() {
  return 3;
}

export function PublishedYearsSelect({
  years,
  selectedYears,
  onSelectedYearsChange,
  disabled = false,
}: {
  years: number[];
  selectedYears: number[];
  onSelectedYearsChange: (years: number[]) => void;
  disabled?: boolean;
}) {
  const [visibleRows, setVisibleRows] = useState(ROWS_PER_PAGE);
  const columns = useSyncExternalStore(subscribeToColumns, getColumns, getServerColumns);
  const availableYears = [...new Set([...years, ...selectedYears])].sort((a, b) => b - a);
  const visibleYears = availableYears.slice(0, visibleRows * columns);
  const allSelected = availableYears.every((year) => selectedYears.includes(year));

  function toggleYear(year: number, checked: boolean) {
    if (checked) {
      onSelectedYearsChange([...new Set([...selectedYears, year])].sort((a, b) => b - a));
    } else if (selectedYears.length > 1) {
      onSelectedYearsChange(selectedYears.filter((selected) => selected !== year));
    }
  }

  return (
    <section
      aria-labelledby="published-years-heading"
      className="bg-card border-border-default flex flex-col gap-5 rounded-[14px] border p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="published-years-heading" className="text-lg font-semibold">
          Años publicados
        </h2>
        <div className="flex items-center gap-3">
          <Switch
            id="published-years-visibility"
            checked={allSelected}
            disabled={disabled || availableYears.length === 1}
            onCheckedChange={(checked) =>
              onSelectedYearsChange(checked ? availableYears : [availableYears[0]])
            }
          />
          <label htmlFor="published-years-visibility" className="cursor-pointer text-sm">
            Publicar todos los años
          </label>
        </div>
      </div>
      <p id="published-years-description" className="text-muted-foreground text-sm">
        Elegí qué años se podrán consultar en el sitio público. Las métricas y temáticas visibles
        serán las mismas para todos los años.
      </p>
      <fieldset
        id="published-years-options"
        aria-describedby="published-years-description published-years-help"
      >
        <legend className="sr-only">Años disponibles para publicar</legend>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {visibleYears.map((year) => {
            const checked = selectedYears.includes(year);
            return (
              <label
                key={year}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 transition-colors ${checked ? 'border-primary bg-primary/5' : 'border-border-default hover:bg-surface-subtle'}`}
              >
                <Checkbox
                  checked={checked}
                  disabled={disabled || (checked && selectedYears.length === 1)}
                  onCheckedChange={(value) => toggleYear(year, value)}
                />
                <span className="text-sm font-medium tabular-nums">{year}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
      {visibleYears.length < availableYears.length && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-center"
          aria-controls="published-years-options"
          onClick={() => setVisibleRows((current) => current + ROWS_PER_PAGE)}
        >
          <Plus aria-hidden="true" />
          Cargar más
        </Button>
      )}
      <div className="border-border-default flex flex-col gap-1 border-t pt-4">
        <p role="status" className="truncate text-sm font-medium">
          {selectedYears.length === 1
            ? '1 año seleccionado'
            : `${selectedYears.length} años seleccionados`}
          {' · '}
          {selectedYears.join(', ')}
        </p>
        <p id="published-years-help" className="text-muted-foreground text-sm">
          Seleccioná al menos un año. El más reciente se mostrará primero.
        </p>
      </div>
    </section>
  );
}
