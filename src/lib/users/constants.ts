import type { UserRole, UserStatus } from '@/generated/prisma/enums';

export type SortBy = 'name' | 'role' | 'status' | 'lastAccess';

export const AVATAR_COLOR_CLASSNAMES = [
  'bg-violet-100 text-violet-800 dark:bg-violet-900/60 dark:text-violet-200',
  'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200',
  'bg-sky-100 text-sky-800 dark:bg-sky-900/60 dark:text-sky-200',
  'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200',
  'bg-orange-100 text-orange-800 dark:bg-orange-900/60 dark:text-orange-200',
  'bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-200',
  'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-200',
  'bg-fuchsia-100 text-fuchsia-800 dark:bg-fuchsia-900/60 dark:text-fuchsia-200',
  'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-200',
  'bg-lime-100 text-lime-800 dark:bg-lime-900/60 dark:text-lime-200',
] as const;

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrador',
  coordinator: 'Coordinador',
};

export const STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Activo',
  pendingInvitation: 'Invitación pendiente',
  disabled: 'Deshabilitado',
};

export const STATUS_CLASSNAMES: Record<UserStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pendingInvitation: 'bg-amber-100 text-amber-700',
  disabled: 'bg-muted text-muted-foreground',
};

export const ROLE_FILTER_LABELS: Record<string, string> = {
  all: 'Todos los roles',
  admin: 'Administrador',
  coordinator: 'Coordinador',
};

export const STATUS_FILTER_LABELS: Record<string, string> = {
  all: 'Todos los estados',
  active: 'Activo',
  pendingInvitation: 'Invitación pendiente',
  disabled: 'Deshabilitado',
};

export const SORT_LABELS: Record<SortBy, string> = {
  name: 'Ordenar: Nombre',
  role: 'Ordenar: Rol',
  status: 'Ordenar: Estado',
  lastAccess: 'Ordenar: Último acceso',
};

export const SORT_VALUE_LABELS: Record<SortBy, string> = {
  name: 'Nombre',
  role: 'Rol',
  status: 'Estado',
  lastAccess: 'Último acceso',
};
