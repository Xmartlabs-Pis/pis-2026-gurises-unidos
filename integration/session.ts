import type { UserRole } from '@/generated/prisma/enums';

let currentUser: { id: string; role?: UserRole; remember: boolean } | null = null;

export function signInAs(userId: number, role?: UserRole, { remember = false } = {}) {
  currentUser = { id: String(userId), role, remember };
}

export function signOut() {
  currentUser = null;
}

export function currentSession() {
  return currentUser === null ? null : { user: currentUser };
}
