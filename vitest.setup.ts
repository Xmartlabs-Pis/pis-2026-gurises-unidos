import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetPrismaMock } from './__tests__/mocks/prisma';

vi.mock('@/lib/prisma', async () => {
  const { prismaMock } = await import('./__tests__/mocks/prisma');
  return { default: prismaMock };
});

beforeEach(() => {
  resetPrismaMock();
});

afterEach(() => {
  cleanup();
});
