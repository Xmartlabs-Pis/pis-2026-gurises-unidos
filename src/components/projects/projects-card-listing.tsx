'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, ListFilter, Loader2Icon, TriangleAlert } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { ProjectCardsGrid, type ProjectListQuery } from '@/components/projects/project-cards-grid';
import type { ProjectListItem } from '@/lib/projects/list';
import { STATUS_FILTERS, type StatusFilterValue } from '@/lib/projects/constants';
import { PROJECT_SEARCH_MAX_LENGTH } from '@/lib/validation/project-filters';
import { ScrollToTopButton } from '@/components/scroll-to-top-button';
import { ExportPdfButton } from '@/components/reports/export-pdf-button';
import { useUrlFilters } from '@/hooks/use-url-filters';
import { loadProjectDataYears } from '@/app/actions/projects';
import { notify } from '@/lib/notify';
import type { ImpactReportRequest } from '@/lib/validation/impact-report';

const ALL_YEARS = 'all';

type YearFilterValue = number | typeof ALL_YEARS;

type ProjectsCardListProps = {
  projects: ProjectListItem[];
  total: number;
  page: number;
  totalPages: number;
  years: number[];
  status: StatusFilterValue;
  beneficiaryYear: number | undefined;
  search: string | undefined;
  departments?: { id: number; name: string }[];
  topics?: { id: number; name: string }[];
  strategicLines?: { id: number; name: string }[];
  beneficiaryCategories?: { id: number; name: string }[];
  departmentId?: number;
  topicId?: number;
  strategicLineId?: number;
  beneficiaryCategoryId?: number;
};

export function ProjectsCardList({
  projects,
  total,
  page,
  totalPages,
  years,
  status,
  beneficiaryYear,
  search,
  departments = [],
  topics = [],
  strategicLines = [],
  beneficiaryCategories = [],
  departmentId,
  topicId,
  strategicLineId,
  beneficiaryCategoryId,
}: ProjectsCardListProps) {
  const { searchText, changeSearch, updateFilters, clearFilters, isPending } = useUrlFilters({
    search,
    resetKeys: ['page'],
  });

  const year: YearFilterValue = beneficiaryYear ?? ALL_YEARS;
  const activeFilterCount =
    Number(year !== (years[0] ?? ALL_YEARS)) +
    Number(departmentId !== undefined) +
    Number(topicId !== undefined) +
    Number(strategicLineId !== undefined) +
    Number(beneficiaryCategoryId !== undefined);
  const yearOptions: { value: YearFilterValue; label: string }[] = [
    { value: ALL_YEARS, label: 'Todos' },
    ...years.map((y) => ({
      value: y,
      label: y === years[0] ? `${y} (por defecto)` : String(y),
    })),
  ];

  const current = STATUS_FILTERS.find((f) => f.value === status) ?? STATUS_FILTERS[0];

  const query = useMemo<ProjectListQuery>(
    () => ({
      status,
      beneficiaryYear: String(year),
      search,
      departmentId: departmentId?.toString(),
      topicId: topicId?.toString(),
      strategicLineId: strategicLineId?.toString(),
      beneficiaryCategoryId: beneficiaryCategoryId?.toString(),
    }),
    [status, year, search, departmentId, topicId, strategicLineId, beneficiaryCategoryId]
  );

  const filteredCountLabel = `${total} ${total === 1 ? 'proyecto' : 'proyectos'}`;

  const [selectedIds, setSelectedIds] = useState<ReadonlyMap<number, number | null> | null>(null);
  const [isSelectingAll, setIsSelectingAll] = useState(false);
  const selectedCount = selectedIds?.size ?? 0;
  const selectedYears = [...new Set([...(selectedIds?.values() ?? [])].filter((y) => y !== null))];
  const reportYear = selectedYears.length === 1 ? selectedYears[0] : undefined;

  function toggleSelection(id: number, dataYear: number | null) {
    setSelectedIds((current) => {
      if (!current) return current;
      const next = new Map(current);
      if (next.has(id)) next.delete(id);
      else next.set(id, dataYear);
      return next;
    });
  }

  async function selectAllFiltered() {
    setIsSelectingAll(true);
    try {
      const projects = await loadProjectDataYears(query);
      setSelectedIds((current) =>
        current
          ? new Map([...current, ...projects.map(({ id, year }) => [id, year] as const)])
          : current
      );
    } catch {
      notify.error({ title: 'No se pudieron seleccionar los proyectos. Probá de nuevo.' });
    } finally {
      setIsSelectingAll(false);
    }
  }

  const reportRequest: ImpactReportRequest | undefined =
    reportYear === undefined
      ? undefined
      : { year: reportYear, projectIds: [...(selectedIds?.keys() ?? [])] };

  const selectionWarning =
    selectedYears.length > 1
      ? 'Los proyectos seleccionados tienen datos de distintos años y no se puede exportar un reporte con varios años. Elegí un año en los filtros.'
      : selectedCount > 0 && selectedYears.length === 0
        ? 'Los proyectos seleccionados no tienen datos cargados.'
        : null;

  const exportReportButton = (
    <Button
      variant="outline"
      className="h-8 gap-2.5 rounded-md px-3 shadow-xs/10"
      onClick={() => setSelectedIds(new Map())}
    >
      <p className="text-primary text-sm leading-5 font-medium tracking-normal">Exportar reporte</p>
    </Button>
  );

  const selectionBar = selectedIds && (
    <div
      role="region"
      aria-label="Selección de proyectos para el reporte"
      className="bg-card sticky top-0 z-10 flex flex-col gap-3 rounded-lg border px-4 py-3 shadow-sm/10 lg:flex-row lg:items-center lg:justify-between"
    >
      <div className="flex flex-col gap-0.5">
        <p className="text-primary text-sm leading-5 font-semibold">
          {selectedCount === 1
            ? '1 proyecto seleccionado'
            : `${selectedCount} proyectos seleccionados`}
        </p>
        {selectionWarning ? (
          <p
            role="status"
            className="text-status-warning flex items-center gap-1.5 text-xs leading-4"
          >
            <TriangleAlert className="size-3.5 shrink-0" aria-hidden="true" />
            {selectionWarning}
          </p>
        ) : (
          <p className="text-muted-foreground text-xs leading-4">
            {reportYear === undefined
              ? 'Elegí los proyectos a incluir en el reporte.'
              : `Reporte ${reportYear}. Podés usar los filtros para encontrar más proyectos.`}
          </p>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="ghost"
          size="sm"
          disabled={isSelectingAll || total === 0}
          aria-busy={isSelectingAll}
          onClick={() => void selectAllFiltered()}
        >
          {isSelectingAll && <Loader2Icon className="animate-spin" aria-hidden="true" />}
          Seleccionar filtrados ({total})
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={selectedCount === 0}
          onClick={() => setSelectedIds(new Map())}
        >
          Limpiar selección
        </Button>
        <Button variant="outline" size="sm" onClick={() => setSelectedIds(null)}>
          Cancelar
        </Button>
        <ExportPdfButton
          href="/api/reports/impact"
          body={reportRequest}
          label="Exportar"
          disabled={selectedCount === 0 || reportRequest === undefined}
          className="h-8 rounded-md px-3"
        />
      </div>
    </div>
  );

  const newProjectButton = (
    <Button
      variant="outline"
      className="h-8 gap-2.5 rounded-md px-3 shadow-xs/10"
      nativeButton={false}
      render={<Link href="/dashboard/projects/new" />}
    >
      <p className="text-primary text-sm leading-5 font-medium tracking-normal">Nuevo proyecto</p>
    </Button>
  );

  const yearSelect = (
    <Select<YearFilterValue>
      items={yearOptions}
      value={year}
      onValueChange={(value) => value !== null && updateFilters({ beneficiaryYear: String(value) })}
    >
      <SelectTrigger aria-label="Filtrar por año" className="w-full">
        <SelectValue className="text-primary text-sm leading-5 tracking-normal" />
      </SelectTrigger>
      <SelectContent
        alignItemWithTrigger={false}
        className="max-h-[min(15rem,var(--available-height))]"
      >
        {yearOptions.map((y) => (
          <SelectItem key={y.value} value={y.value}>
            {y.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  const filterMenu = (
    <Popover>
      <PopoverTrigger
        render={<Button variant="outline" size="icon" className="relative h-9 w-9" />}
        aria-label="Filtros de proyectos"
        aria-description={`${activeFilterCount} filtros activos`}
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
      <PopoverContent align="end" className="w-72 gap-4 p-4">
        <div className="flex flex-col gap-2">
          <span>Año</span>
          {yearSelect}
        </div>
        {(
          [
            {
              key: 'departmentId',
              label: 'Departamento',
              allLabel: 'Todos',
              options: departments,
              value: departmentId,
            },
            {
              key: 'topicId',
              label: 'Temática',
              allLabel: 'Todas',
              options: topics,
              value: topicId,
            },
            {
              key: 'strategicLineId',
              label: 'Línea estratégica',
              allLabel: 'Todas',
              options: strategicLines,
              value: strategicLineId,
            },
            {
              key: 'beneficiaryCategoryId',
              label: 'Categoría de beneficiarios',
              allLabel: 'Todas',
              options: beneficiaryCategories,
              value: beneficiaryCategoryId,
            },
          ] as const
        ).map(({ key, label, allLabel, options, value }) => {
          const filterOptions = [
            { value: 'all', label: allLabel },
            ...options.map((option) => ({ value: String(option.id), label: option.name })),
          ];

          return (
            <div key={key} className="flex flex-col gap-2">
              <span>{label}</span>
              <Select
                items={filterOptions}
                value={value?.toString() ?? 'all'}
                onValueChange={(selected) =>
                  updateFilters({ [key]: selected === 'all' ? null : selected })
                }
              >
                <SelectTrigger aria-label={`Filtrar por ${label.toLowerCase()}`} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent
                  alignItemWithTrigger={false}
                  className="max-h-[min(15rem,var(--available-height))]"
                >
                  {filterOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() =>
            clearFilters([
              'beneficiaryYear',
              'departmentId',
              'topicId',
              'strategicLineId',
              'beneficiaryCategoryId',
            ])
          }
        >
          Limpiar filtros
        </Button>
      </PopoverContent>
    </Popover>
  );

  return (
    <div className="bg-primary-foreground flex h-full w-auto flex-col gap-5 pt-5 pr-4 pb-4 pl-4 lg:px-8 lg:py-7">
      <div className="flex flex-row items-start justify-between gap-3 lg:items-center">
        <div className="flex flex-col justify-center gap-0.5">
          <p className="text-muted-foreground block text-xs leading-4 font-medium lg:hidden">
            Proyectos
          </p>
          <h1 className="text-primary shrink-0 grow text-2xl leading-8 font-bold tracking-normal">
            {current.title}
          </h1>
        </div>
        <div className="flex flex-col items-end gap-3">
          <div className="lg:hidden">{filterMenu}</div>
          <div className="flex flex-wrap justify-end gap-2">
            {!selectedIds && exportReportButton}
            {newProjectButton}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-row items-center gap-3">
          <Tabs value={status} onValueChange={(value) => updateFilters({ status: String(value) })}>
            <div className="bg-secondary flex h-9 w-fit flex-row items-center rounded-lg px-0.5 py-0.75">
              <TabsList aria-label="Filtrar por estado">
                {STATUS_FILTERS.map((f) => (
                  <TabsTrigger
                    key={f.value}
                    value={f.value}
                    className={cn(
                      'text-muted-foreground h-7.25 cursor-pointer gap-2.5 rounded-md px-2 py-1 text-sm font-medium',
                      'data-active:bg-card data-active:text-primary data-active:border-border data-active:shadow-sm/10'
                    )}
                  >
                    {f.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
          </Tabs>
          <p className="text-muted-foreground hidden text-sm leading-5 font-normal tracking-normal lg:block">
            {filteredCountLabel}
          </p>
        </div>
        <InputGroup className="bg-background h-9 w-full rounded-md lg:ml-auto lg:w-80">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Buscar proyectos por nombre"
            placeholder="Buscar por nombre..."
            maxLength={PROJECT_SEARCH_MAX_LENGTH}
            value={searchText}
            onChange={(e) => changeSearch(e.target.value)}
          />
        </InputGroup>
        <div className="hidden lg:block">{filterMenu}</div>
      </div>
      <p className="text-primary block text-lg leading-7 font-semibold lg:hidden">
        {filteredCountLabel}
      </p>

      {selectionBar}

      <ProjectCardsGrid
        key={JSON.stringify(query)}
        projects={projects}
        page={page}
        totalPages={totalPages}
        query={query}
        isPending={isPending}
        selectedIds={selectedIds}
        onToggleSelection={toggleSelection}
      />
      <ScrollToTopButton />
    </div>
  );
}
