import { beforeEach, describe, expect, it, vi } from 'vitest';
import prisma from '@/lib/prisma';
import { getProjectSheetData } from '@/lib/reports/project-sheet';

vi.mock('@/lib/prisma', () => ({ default: { project: { findFirst: vi.fn() } } }));
vi.mock('@/lib/metrics/year', () => ({ getCurrentYear: () => 2026 }));
vi.mock('@/lib/beneficiary-categories', () => ({
  getActiveBeneficiaryCategories: async () => [
    { key: 'directChildrenAdolescents', name: 'NNA directos' },
  ],
}));

function beneficiaries(year: number, value: number) {
  return { year, values: [{ value, category: { key: 'directChildrenAdolescents' } }] };
}

function mockProject(projectBeneficiaries: ReturnType<typeof beneficiaries>[]) {
  vi.mocked(prisma.project.findFirst).mockResolvedValue({
    name: 'Faro',
    status: 'active',
    intensity: 'high',
    counterpartyTypes: [],
    startYear: 2026,
    endYear: null,
    generalObjective: null,
    publicDescription: null,
    showOnLanding: false,
    geographicScope: 'national',
    departments: [{ id: 1, name: 'Montevideo' }],
    localities: [],
    countries: [],
    region: null,
    leadCoordinator: { firstName: 'Ana', lastName: 'García' },
    topics: [],
    strategicLines: [],
    partners: [],
    projectBeneficiaries,
  } as never);
}

describe('getProjectSheetData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('has no comparison year when the previous year has no data', async () => {
    mockProject([beneficiaries(2026, 12)]);

    const result = await getProjectSheetData(1, 2026);

    expect(result.status === 'success' && result.data.comparisonYear).toBeNull();
  });

  it('compares against the previous year when it has data', async () => {
    mockProject([beneficiaries(2026, 12), beneficiaries(2025, 10)]);

    const result = await getProjectSheetData(1, 2026);

    expect(result.status === 'success' && result.data.comparisonYear).toBe(2025);
  });
});
