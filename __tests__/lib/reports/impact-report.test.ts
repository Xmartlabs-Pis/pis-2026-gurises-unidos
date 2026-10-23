import { beforeEach, describe, expect, it, vi } from 'vitest';
import prisma from '@/lib/prisma';
import { getMetricValues, type MetricValues } from '@/lib/metrics/queries';
import { getImpactReportData } from '@/lib/reports/impact-report';

vi.mock('@/lib/prisma', () => ({
  default: {
    project: { findMany: vi.fn(), count: vi.fn() },
    department: { count: vi.fn(), findUnique: vi.fn() },
    topic: { findUnique: vi.fn() },
  },
}));
vi.mock('@/lib/metrics/queries', () => ({ getMetricValues: vi.fn() }));
vi.mock('@/lib/metrics/year', () => ({ getCurrentYear: () => 2026 }));
vi.mock('@/lib/beneficiary-categories', () => ({
  getActiveBeneficiaryCategories: async () => [
    { key: 'directChildrenAdolescents', name: 'NNA directos' },
    { key: 'coordinatedInstitutions', name: 'Instituciones coordinadas' },
  ],
}));
vi.mock('@/lib/projects/beneficiary-values', () => ({
  sumBeneficiaryCounts: async () => ({ directChildrenAdolescents: 40, coordinatedInstitutions: 3 }),
}));

const ADMIN = { id: 1, role: 'admin' as const };
const COORDINATOR = { id: 7, role: 'coordinator' as const };

function metricValues(overrides: Partial<MetricValues> = {}): MetricValues {
  return {
    children_reached: 0,
    direct_children_reached: 0,
    indirect_children_reached: 0,
    families: 0,
    teachers: 0,
    institutions: 0,
    departments: 0,
    active_projects: 0,
    ...overrides,
  };
}

function mockMetricsByYear(values: Record<number, MetricValues>) {
  vi.mocked(getMetricValues).mockImplementation(async (year) => values[year] ?? metricValues());
}

describe('getImpactReportData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(prisma.department.count).mockResolvedValue(19);
    vi.mocked(prisma.project.count).mockResolvedValue(3);
    vi.mocked(prisma.project.findMany).mockResolvedValue([
      {
        geographicScope: 'national',
        countries: [],
        topics: [{ name: 'Salud' }, { name: 'Educación' }],
        departments: [{ name: 'Montevideo' }],
      },
      {
        geographicScope: 'national',
        countries: [],
        topics: [{ name: 'Educación' }],
        departments: [{ name: 'Montevideo' }, { name: 'Salto' }],
      },
      {
        geographicScope: 'international',
        countries: ['Brasil'],
        topics: [],
        departments: [],
      },
    ] as never);
  });

  it('returns nothing when the year has no data', async () => {
    mockMetricsByYear({});

    expect(await getImpactReportData(ADMIN, 2026, {})).toBeNull();
  });

  it('builds the indicators with the NNA total and deltas', async () => {
    mockMetricsByYear({
      2026: metricValues({ children_reached: 110, families: 30, teachers: 45, active_projects: 3 }),
      2025: metricValues({ children_reached: 100, families: 40, teachers: 45, active_projects: 4 }),
    });

    const data = await getImpactReportData(ADMIN, 2026, {});

    expect(data?.kpis).toEqual([
      expect.objectContaining({ value: 110, delta: '+10,0 % frente a 2025 (100)' }),
      expect.objectContaining({ value: 30, delta: '−25,0 % frente a 2025 (40)' }),
      expect.objectContaining({ value: 45, delta: 'Igual que en 2025' }),
      expect.objectContaining({ value: 3, delta: '1 menos que en 2025 (4)' }),
    ]);
    expect(data?.topics).toEqual([
      { label: 'Educación', value: 2 },
      { label: 'Salud', value: 1 },
    ]);
    expect(data?.departments).toEqual([
      { label: 'Montevideo', value: 2 },
      { label: 'Salto', value: 1 },
    ]);
    expect(data?.internationalCountries).toEqual(['Brasil']);
    expect(data?.categories).toEqual([
      { label: 'NNA directos', value: 40 },
      { label: 'Instituciones coordinadas', value: 3 },
    ]);
    expect(data?.pendingProjects).toBe(3);
  });

  it('hides the deltas without data from the previous year', async () => {
    mockMetricsByYear({ 2024: metricValues({ children_reached: 5, active_projects: 1 }) });

    const data = await getImpactReportData(ADMIN, 2024, {});

    expect(data?.kpis.every(({ delta }) => delta === null)).toBe(true);
    expect(data?.pendingProjects).toBeNull();
  });

  it('limits a coordinator to their own projects even when other projects are requested', async () => {
    mockMetricsByYear({ 2026: metricValues({ active_projects: 1 }) });

    await getImpactReportData(COORDINATOR, 2026, { leadCoordinatorId: '99' });

    expect(getMetricValues).toHaveBeenCalledWith(2026, {
      AND: [{ leadCoordinatorId: COORDINATOR.id }, {}],
    });
  });

  it('applies and lists the requested filters', async () => {
    mockMetricsByYear({ 2026: metricValues({ active_projects: 1 }) });
    vi.mocked(prisma.topic.findUnique).mockResolvedValue({ id: 4, name: 'Salud' } as never);

    const data = await getImpactReportData(ADMIN, 2026, { topicId: '4', status: 'active' });

    expect(getMetricValues).toHaveBeenCalledWith(2026, {
      AND: [{}, { status: 'active', topics: { some: { id: 4 } } }],
    });
    expect(data?.appliedFilters).toEqual(['Temática: Salud', 'Estado: Activo']);
  });
});
