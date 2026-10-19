import { vi } from 'vitest';

export const prismaMock = {
  user: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    update: vi.fn(),
    count: vi.fn(),
  },
  project: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    count: vi.fn(),
  },
  projectBeneficiary: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
  },
  projectBeneficiaryValue: {
    aggregate: vi.fn(),
  },
  topic: {
    findMany: vi.fn(),
  },
  department: {
    findMany: vi.fn(),
  },
  $transaction: vi.fn(),
};

function resetMockValue(value: unknown) {
  if (
    typeof value === 'function' &&
    'mockReset' in value &&
    typeof value.mockReset === 'function'
  ) {
    value.mockReset();
    return;
  }

  if (value && typeof value === 'object') {
    for (const nested of Object.values(value)) {
      resetMockValue(nested);
    }
  }
}

export function resetPrismaMock() {
  resetMockValue(prismaMock);
}
