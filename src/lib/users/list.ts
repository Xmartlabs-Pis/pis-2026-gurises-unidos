import type { Prisma } from '@/generated/prisma/client';
import { UserRole, UserStatus } from '@/generated/prisma/enums';
import prisma from '@/lib/prisma';
import { firstValue, type RawSearchParams } from '@/lib/url-filters';
import type { SortBy } from '@/lib/users/constants';
import type { User } from '@/lib/users/format';

export type UserListFilters = {
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  sortBy?: SortBy;
};

const NAME_ORDER: Prisma.UserOrderByWithRelationInput[] = [
  { firstName: 'asc' },
  { lastName: 'asc' },
  { id: 'asc' },
];

const ORDER_BY: Record<SortBy, Prisma.UserOrderByWithRelationInput[]> = {
  name: NAME_ORDER,
  role: [{ role: 'asc' }, ...NAME_ORDER],
  status: [{ status: 'asc' }, ...NAME_ORDER],
  lastAccess: [{ lastAccess: { sort: 'desc', nulls: 'last' } }, ...NAME_ORDER],
};

function resolveSortBy(sortBy?: string): SortBy {
  return sortBy && Object.hasOwn(ORDER_BY, sortBy) ? (sortBy as SortBy) : 'name';
}

export async function getUserList(filters: UserListFilters = {}): Promise<User[]> {
  const { search, role, status, sortBy } = filters;
  const searchTerms = search?.trim().split(/\s+/).filter(Boolean) ?? [];

  const where: Prisma.UserWhereInput = {
    deletedAt: null,
    ...(role ? { role } : {}),
    ...(status ? { status } : {}),
    ...(searchTerms.length > 0
      ? {
          AND: searchTerms.map((term) => ({
            OR: [
              { firstName: { contains: term, mode: 'insensitive' } },
              { lastName: { contains: term, mode: 'insensitive' } },
              { email: { contains: term, mode: 'insensitive' } },
            ],
          })),
        }
      : {}),
  };

  return prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      status: true,
      lastAccess: true,
    },
    orderBy: ORDER_BY[sortBy ?? 'name'],
  });
}

const NOT_DELETED_WHERE = { deletedAt: null };

function isUserRole(value?: string): value is UserRole {
  return Object.values(UserRole).includes(value as UserRole);
}

function isUserStatus(value?: string): value is UserStatus {
  return Object.values(UserStatus).includes(value as UserStatus);
}

export function parseUserListFilters(searchParams: RawSearchParams): UserListFilters {
  const role = firstValue(searchParams.role);
  const status = firstValue(searchParams.status);

  return {
    search: firstValue(searchParams.q)?.trim() || undefined,
    role: isUserRole(role) ? role : undefined,
    status: isUserStatus(status) ? status : undefined,
    sortBy: resolveSortBy(firstValue(searchParams.sort)),
  };
}

export async function getUserStats() {
  const [total, admins, coordinators, pendingInvitations] = await Promise.all([
    prisma.user.count({ where: NOT_DELETED_WHERE }),
    prisma.user.count({ where: { ...NOT_DELETED_WHERE, role: 'admin' } }),
    prisma.user.count({ where: { ...NOT_DELETED_WHERE, role: 'coordinator' } }),
    prisma.user.count({ where: { ...NOT_DELETED_WHERE, status: 'pendingInvitation' } }),
  ]);

  return { total, admins, coordinators, pendingInvitations };
}
