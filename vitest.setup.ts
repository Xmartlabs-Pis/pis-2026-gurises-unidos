import { afterEach, beforeEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { resetPrismaMock } from './__tests__/mocks/prisma';

if (typeof Element !== 'undefined') {
  Element.prototype.scrollIntoView ??= vi.fn();
}

vi.mock('@/lib/prisma', async () => {
  const { prismaMock } = await import('./__tests__/mocks/prisma');
  return { default: prismaMock };
});

vi.mock('@/components/ui/forms/pending-changes-provider', () => ({
  usePendingChanges: () => ({
    runWithoutConfirmation: (action: () => void) => action(),
  }),
  usePendingChangesContext: () => ({
    confirmLeave: async () => true,
  }),
}));

beforeEach(() => {
  resetPrismaMock();
});

afterEach(() => {
  cleanup();
});
