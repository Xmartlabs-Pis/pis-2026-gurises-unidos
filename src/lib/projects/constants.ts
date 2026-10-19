import type { ProjectStatus } from '@/generated/prisma/enums';

export const STATUS_BADGE_VARIANT: Record<ProjectStatus, 'active' | 'neutral'> = {
  active: 'active',
  inactive: 'neutral',
};

export const STATUS_FILTERS = [
  { value: 'all', label: 'Todos', title: 'Proyectos' },
  { value: 'active', label: 'Activos', title: 'Proyectos activos' },
  { value: 'inactive', label: 'Inactivos', title: 'Proyectos inactivos' },
] as const;

export type StatusFilterValue = (typeof STATUS_FILTERS)[number]['value'];
