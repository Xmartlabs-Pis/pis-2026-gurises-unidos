import type { UserRole } from '@/generated/prisma/enums';

export const ACCESS_DENIED_ROUTE = '/access-denied';

const ROUTE_ROLES: readonly { path: string; roles: readonly UserRole[] }[] = [
  { path: '/management', roles: ['admin'] },
  { path: '/management/profile', roles: ['admin', 'coordinator'] },
];

function matchesRoute(pathname: string, path: string) {
  return pathname === path || pathname.startsWith(`${path}/`);
}

export function canAccessRoute(pathname: string, role: UserRole) {
  const [rule] = ROUTE_ROLES.filter(({ path }) => matchesRoute(pathname, path)).sort(
    (a, b) => b.path.length - a.path.length
  );
  return !rule || rule.roles.includes(role);
}
