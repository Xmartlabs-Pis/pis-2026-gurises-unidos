import {
  ChartNoAxesColumn,
  // FileChartColumnIncreasing,
  FolderKanban,
  HomeIcon,
  Tags,
  Waypoints,
  type LucideIcon,
  // Newspaper,
  Users,
  UsersRound,
} from 'lucide-react';
import type { UserRole } from '@/generated/prisma/enums';

export type PathMatch = 'exact' | 'prefix';

export interface NavigationItem {
  id: string;
  title: string;
  href: string;
  icon: LucideIcon;
  match?: PathMatch;
  roles?: readonly UserRole[];
  children?: readonly NavigationItem[];
}

export interface NavigationGroup {
  id: string;
  title: string;
  items: readonly NavigationItem[];
}

function isPathActive(pathname: string, href: string, match: PathMatch = 'prefix') {
  if (match === 'exact') {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function isItemActive(pathname: string, item: { href: string; match?: PathMatch }) {
  return isPathActive(pathname, item.href, item.match ?? 'prefix');
}

export const NAV_GROUPS: readonly NavigationGroup[] = [
  {
    id: 'main',
    title: 'Principal',
    items: [
      {
        id: 'dashboard',
        title: 'Dashboard',
        href: '/dashboard',
        icon: HomeIcon,
        match: 'exact',
        children: [
          {
            id: 'projects',
            title: 'Proyectos',
            href: '/dashboard/projects',
            icon: FolderKanban,
          },
          // {
          //   id: 'beneficiaries',
          //   title: 'Beneficiarios',
          //   href: '#',
          //   icon: Users,
          // },
        ],
      },
      // {
      //   id: 'publications',
      //   title: 'Publicaciones',
      //   href: '#',
      //   icon: Newspaper,
      // },
      // {
      //   id: 'reports',
      //   title: 'Reportes',
      //   href: '#',
      //   icon: FileChartColumnIncreasing,
      // },
    ],
  },
  {
    id: 'administration',
    title: 'Administración',
    items: [
      {
        id: 'users',
        title: 'Usuarios',
        href: '/management/users',
        icon: Users,
        roles: ['admin'],
      },
      {
        id: 'topics',
        title: 'Temáticas',
        href: '/management/topics',
        icon: Tags,
        roles: ['admin'],
      },
      {
        id: 'beneficiary-categories',
        title: 'Categorías de beneficiarios',
        href: '/management/beneficiary-categories',
        icon: UsersRound,
        roles: ['admin'],
      },
      {
        id: 'strategicLines',
        title: 'Líneas estratégicas',
        href: '/management/strategic-lines',
        icon: Waypoints,
        roles: ['admin'],
      },
      {
        id: 'metrics',
        title: 'Gestión de Métricas',
        href: '/management/metrics',
        icon: ChartNoAxesColumn,
        roles: ['admin'],
      },
    ],
  },
];

export function canAccessNavItem(item: NavigationItem, role: UserRole) {
  return !item.roles || item.roles.includes(role);
}

export function filterNavGroups(groups: readonly NavigationGroup[], role: UserRole) {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => canAccessNavItem(item, role)),
    }))
    .filter((group) => group.items.length > 0);
}

export function flattenNavItems(items: readonly NavigationItem[]): NavigationItem[] {
  return items.flatMap((item) => {
    if (!item.children?.length) {
      return [item];
    }

    const { children, ...parent } = item;
    return [parent, ...children];
  });
}
