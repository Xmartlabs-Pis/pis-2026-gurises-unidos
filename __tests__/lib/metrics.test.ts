import { beforeEach, describe, expect, it, vi } from 'vitest';
import prisma from '@/lib/prisma';
import { getMetricSettings, getMetricValues, getMetricYears } from '@/lib/metrics/queries';

vi.mock('@/lib/prisma', () => ({
  default: {
    metric: { findMany: vi.fn() },
    projectBeneficiary: { findMany: vi.fn() },
    projectBeneficiaryValue: { groupBy: vi.fn() },
    beneficiaryCategory: { findMany: vi.fn() },
  },
}));

function mockBeneficiarySums(sums: Record<string, number>) {
  const keys = Object.keys(sums);
  vi.mocked(prisma.beneficiaryCategory.findMany).mockResolvedValue(
    keys.map((key, index) => ({ id: index + 1, key })) as Awaited<
      ReturnType<typeof prisma.beneficiaryCategory.findMany>
    >
  );
  vi.mocked(prisma.projectBeneficiaryValue.groupBy).mockResolvedValue(
    keys.map((key, index) => ({ categoryId: index + 1, _sum: { value: sums[key] } })) as never
  );
}

describe('getMetricValues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([2026, 2027])('uses the selected year %i for both data sources', async (year) => {
    mockBeneficiarySums({
      directChildrenAdolescents: 100,
      indirectChildrenAdolescents: 40,
      families: 20,
      basicServiceStaff: 12,
      coordinatedInstitutions: 5,
    });
    vi.mocked(prisma.projectBeneficiary.findMany).mockResolvedValue([
      { projectId: 1, project: { departments: [{ id: 1 }] } },
      { projectId: 2, project: { departments: [{ id: 1 }, { id: 2 }] } },
      { projectId: 3, project: { departments: [] } },
    ] as unknown as Awaited<ReturnType<typeof prisma.projectBeneficiary.findMany>>);

    expect(await getMetricValues(year)).toEqual({
      children_reached: 140,
      direct_children_reached: 100,
      indirect_children_reached: 40,
      families: 20,
      teachers: 12,
      institutions: 5,
      departments: 2,
      active_projects: 3,
    });
    expect(prisma.projectBeneficiaryValue.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { beneficiary: { year, project: { deletedAt: null } } },
      })
    );
    expect(prisma.projectBeneficiary.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { year, project: { deletedAt: null } } })
    );
  });

  it('returns zeros when the year has no data', async () => {
    mockBeneficiarySums({});
    vi.mocked(prisma.projectBeneficiary.findMany).mockResolvedValue([]);

    expect(Object.values(await getMetricValues(2027))).toEqual([0, 0, 0, 0, 0, 0, 0, 0]);
  });
});

describe('getMetricSettings', () => {
  it('loads saved visibility and uses defaults for metrics without a saved setting', async () => {
    vi.mocked(prisma.metric.findMany).mockResolvedValue([
      { key: 'indirect_children_reached', showPublicly: false },
      { key: 'families', showPublicly: true },
    ] as Awaited<ReturnType<typeof prisma.metric.findMany>>);
    const settings = await getMetricSettings();
    expect(settings.filter((metric) => metric.showPublicly).map((metric) => metric.key)).toEqual([
      'direct_children_reached',
      'families',
      'departments',
      'active_projects',
    ]);
    expect(settings).toHaveLength(7);
  });
});

describe('getMetricYears', () => {
  it('includes the previous and current years even without records', async () => {
    vi.mocked(prisma.projectBeneficiary.findMany).mockResolvedValue([]);

    expect(await getMetricYears(2026)).toEqual([2026, 2025]);
    expect(await getMetricYears(2027)).toEqual([2027, 2026]);
  });

  it('combines historical years without duplicates or future years', async () => {
    vi.mocked(prisma.projectBeneficiary.findMany).mockResolvedValue([
      { year: 2024 },
      { year: 2025 },
      { year: 2027 },
    ] as Awaited<ReturnType<typeof prisma.projectBeneficiary.findMany>>);
    expect(await getMetricYears(2026)).toEqual([2026, 2025, 2024]);
  });
});
