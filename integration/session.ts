import type { UserRole } from '@/generated/prisma/enums';

let currentUser: { id: string; role?: UserRole } | null = null;

export function signInAs(userId: number, role?: UserRole) {
  currentUser = { id: String(userId), role };
}

export function signOut() {
  currentUser = null;
}

export function currentSession() {
  return currentUser === null ? null : { user: currentUser };
}
