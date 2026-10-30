import bcrypt from 'bcryptjs';
import type { User } from '@/generated/prisma/client';

export const TEST_PASSWORD = 'secret';
export const TEST_PASSWORD_HASH = bcrypt.hashSync(TEST_PASSWORD, 4);

let nextUserId = 1;

export function makeUser(overrides: Partial<User> = {}): User {
  const id = overrides?.id ?? nextUserId++;

  return {
    id,
    firstName: 'Ana',
    lastName: 'Admin',
    documentId: String(41_000_000 + id),
    email: `user${id}@example.com`,
    role: 'admin',
    status: 'active',
    passwordHash: TEST_PASSWORD_HASH,
    passwordChangedAt: null,
    mustChangePassword: false,
    lastAccess: null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    createdBy: null,
    updatedAt: null,
    deletedAt: null,
    ...overrides,
  };
}
