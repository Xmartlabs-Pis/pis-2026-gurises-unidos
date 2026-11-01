'use client';

import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
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

        <Sheet>
          <SheetTrigger
            render={
              <Button variant="outline" className="shrink-0 xl:hidden">
                Filtros
              </Button>
            }
          />
          <SheetContent side="bottom" showCloseButton={false} className="rounded-t-2xl">
            <div className="bg-muted mx-auto mt-2 h-1.5 w-10 rounded-full" />

            <div className="flex items-center justify-between px-4 pt-2">
              <SheetTitle className="text-lg">Filtros</SheetTitle>
              <button
                type="button"
                onClick={() => clearFilters(['role', 'status', 'sort'])}
                className="text-muted-foreground text-sm"
              >
                Limpiar
              </button>
            </div>

            <div className="flex flex-col gap-4 px-4 pb-2">
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
            </div>

            <div className="p-4 pt-2">
              <SheetClose render={<Button className="w-full">Aplicar filtros</Button>} />
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <span className="hidden text-sm leading-5 font-normal tracking-normal md:inline">
        {formatUserCount(filteredCount)}
      </span>
    </div>
  );
}
