import type { User as PrismaUser } from '@/generated/prisma/client';

export type User = Pick<
  PrismaUser,
  'id' | 'firstName' | 'lastName' | 'email' | 'role' | 'status' | 'lastAccess'
>;

export function fullName(user: Pick<PrismaUser, 'firstName' | 'lastName'>) {
  return `${user.firstName} ${user.lastName}`;
}

export function formatDate(date: Date | null) {
  if (!date) return 'Nunca';
  return new Date(date).toLocaleDateString('es-UY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'America/Montevideo',
  });
}

export function formatUserDate(date: Date | null) {
  if (!date) return '—';
  return formatDate(date);
}

export function formatUserCount(count: number) {
  if (count === 0) return 'No hay resultados';
  if (count === 1) return '1 usuario';
  return `${count} usuarios`;
}
