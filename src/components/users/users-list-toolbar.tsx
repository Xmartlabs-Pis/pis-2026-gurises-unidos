'use client';

import { ListFilter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useUrlFilters } from '@/hooks/use-url-filters';
import {
  ROLE_FILTER_LABELS,
  STATUS_FILTER_LABELS,
  SORT_LABELS,
  SORT_VALUE_LABELS,
  type SortBy,
} from '@/lib/users/constants';
import { formatUserCount } from '@/lib/users/format';
import type { UserListFilters } from '@/lib/users/list';

const DEFAULT_SORT: SortBy = 'name';

function toFilterParam(value: string | null) {
  return value === 'all' ? null : value;
}

function toSortParam(value: string | null) {
  return value === DEFAULT_SORT ? null : value;
}

export function UsersListToolbar({
  filters,
  filteredCount,
}: {
  filters: UserListFilters;
  filteredCount: number;
}) {
  const { searchText, changeSearch, updateFilters, clearFilters } = useUrlFilters({
    search: filters.search,
    searchKey: 'q',
  });

  const roleFilter = filters.role ?? 'all';
  const statusFilter = filters.status ?? 'all';
  const sortBy = filters.sortBy ?? DEFAULT_SORT;
  const activeFilterCount =
    Number(Boolean(filters.role)) +
    Number(Boolean(filters.status)) +
    Number(sortBy !== DEFAULT_SORT);

  const roleSelect = (
    <Select
      value={roleFilter}
      onValueChange={(value) => updateFilters({ role: toFilterParam(value) })}
    >
      <SelectTrigger aria-label="Filtrar por rol">
        <SelectValue>{(value: string) => ROLE_FILTER_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los roles</SelectItem>
        <SelectItem value="admin">Administrador</SelectItem>
        <SelectItem value="coordinator">Coordinador</SelectItem>
      </SelectContent>
    </Select>
  );

  const statusSelect = (
    <Select
      value={statusFilter}
      onValueChange={(value) => updateFilters({ status: toFilterParam(value) })}
    >
      <SelectTrigger aria-label="Filtrar por estado">
        <SelectValue>{(value: string) => STATUS_FILTER_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">Todos los estados</SelectItem>
        <SelectItem value="active">Activo</SelectItem>
        <SelectItem value="pendingInvitation">Invitación pendiente</SelectItem>
        <SelectItem value="disabled">Deshabilitado</SelectItem>
      </SelectContent>
    </Select>
  );

  const sortSelect = (
    <Select value={sortBy} onValueChange={(value) => updateFilters({ sort: toSortParam(value) })}>
      <SelectTrigger aria-label="Ordenar por">
        <SelectValue>{(value: SortBy) => SORT_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="name">Nombre</SelectItem>
        <SelectItem value="role">Rol</SelectItem>
        <SelectItem value="status">Estado</SelectItem>
        <SelectItem value="lastAccess">Último acceso</SelectItem>
      </SelectContent>
    </Select>
  );

  const mobileSortSelect = (
    <Select value={sortBy} onValueChange={(value) => updateFilters({ sort: toSortParam(value) })}>
      <SelectTrigger aria-label="Ordenar por">
        <SelectValue>{(value: SortBy) => SORT_VALUE_LABELS[value]}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="name">Nombre</SelectItem>
        <SelectItem value="role">Rol</SelectItem>
        <SelectItem value="status">Estado</SelectItem>
        <SelectItem value="lastAccess">Último acceso</SelectItem>
      </SelectContent>
    </Select>
  );

  return (
    <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex w-full items-center gap-2 xl:w-auto">
        <InputGroup className="h-9 min-w-0 flex-1 rounded-md sm:w-80 sm:flex-none">
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            aria-label="Buscar usuarios"
            placeholder="Buscar por nombre o correo..."
            value={searchText}
            onChange={(e) => changeSearch(e.target.value)}
          />
        </InputGroup>

        <div className="hidden gap-2 xl:flex">
          {roleSelect}
          {statusSelect}
          {sortSelect}
        </div>

        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                size="icon"
                className="relative h-9 w-9 shrink-0 xl:hidden"
              />
            }
            aria-label="Filtros de usuarios"
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
          <PopoverContent
            align="end"
            className="w-72 max-w-[calc(100vw-2rem)] gap-4 p-4 [&_[data-slot=select-trigger]]:w-full"
          >
            <div className="flex flex-col gap-1.5">
              <span className="text-foreground text-sm font-medium">Rol</span>
              {roleSelect}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-foreground text-sm font-medium">Estado</span>
              {statusSelect}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-foreground text-sm font-medium">Ordenar por</span>
              {mobileSortSelect}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={() => clearFilters(['role', 'status', 'sort'])}
            >
              Limpiar filtros
            </Button>
          </PopoverContent>
        </Popover>
      </div>

      <span className="hidden text-sm leading-5 font-normal tracking-normal md:inline">
        {formatUserCount(filteredCount)}
      </span>
    </div>
  );
}
