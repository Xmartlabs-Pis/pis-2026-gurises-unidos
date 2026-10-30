import { afterAll, afterEach, vi } from 'vitest';
import prisma from '@/lib/prisma';
import { signOut } from './session';

vi.mock('@/auth', async () => {
  const { currentSession } = await import('./session');
  return { auth: vi.fn(async () => currentSession()) };
});
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

afterEach(() => {
  signOut();
});

afterAll(async () => {
  await prisma.$disconnect();
});
