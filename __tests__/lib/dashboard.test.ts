import { beforeEach, describe, expect, it, vi } from 'vitest';
import prisma from '@/lib/prisma';
import { getDashboardOverview } from '@/lib/dashboard/queries';
import { getMetricValues, type MetricValues } from '@/lib/metrics/queries';
import { beneficiaryValueRows } from '../mocks/beneficiary-values';

vi.mock('@/lib/prisma', () => ({
  default: { project: { findMany: vi.fn() } },
}));
vi.mock('@/lib/metrics/queries', () => ({ getMetricValues: vi.fn() }));

function metricValues(overrides: Partial<MetricValues> = {}): MetricValues {
  return {
    children_reached: 0,
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

function mockProjects(projects: unknown[]) {
  vi.mocked(prisma.project.findMany).mockResolvedValue(
    projects as Awaited<ReturnType<typeof prisma.project.findMany>>
  );
}

describe('getDashboardOverview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProjects([]);
  });

  it('reads metrics for the selected year and the previous one', async () => {
    mockMetricsByYear({});

    await getDashboardOverview(2026);

    expect(getMetricValues).toHaveBeenCalledWith(2026);
    expect(getMetricValues).toHaveBeenCalledWith(2025);
  });

  it('builds the KPIs from the metric values with deltas against the previous year', async () => {
    mockMetricsByYear({
      2026: metricValues({ children_reached: 110, families: 30, teachers: 45, active_projects: 4 }),
      2025: metricValues({ children_reached: 100, families: 40, teachers: 45, active_projects: 5 }),
    });

    const { heroKpi, secondaryKpis } = await getDashboardOverview(2026);

    expect(heroKpi).toEqual({
      value: 110,
      label: 'niños, niñas y adolescentes alcanzados en 2026',
      delta: '+10.0% vs. año anterior',
    });
    expect(secondaryKpis).toEqual([
      { value: 30, label: 'familias acompañadas en 2026', delta: '−25.0% vs. año anterior' },
      {
        value: 45,
        label: 'funcionarios de servicios básicos formados en 2026',
        delta: 'Sin cambios vs. año anterior',
      },
      { value: 4, label: 'proyectos con actividad en 2026', delta: '−1 respecto a 2025' },
    ]);
  });

  it('does not compute a percentage when the previous year has no data', async () => {
    mockMetricsByYear({ 2026: metricValues({ children_reached: 50, active_projects: 2 }) });

    const { heroKpi, secondaryKpis } = await getDashboardOverview(2026);

    expect(heroKpi.delta).toBe('Sin datos del año anterior');
    expect(secondaryKpis[2].delta).toBe('+2 respecto a 2025');
  });

  it('reports no change when the percentage rounds to zero', async () => {
    mockMetricsByYear({
      2026: metricValues({ children_reached: 10001, families: 9999 }),
      2025: metricValues({ children_reached: 10000, families: 10000 }),
    });

    const { heroKpi, secondaryKpis } = await getDashboardOverview(2026);

    expect(heroKpi.delta).toBe('Sin cambios vs. año anterior');
    expect(secondaryKpis[0].delta).toBe('Sin cambios vs. año anterior');
  });

  it('reports no change when the project count matches the previous year', async () => {
    mockMetricsByYear({
      2026: metricValues({ active_projects: 3 }),
      2025: metricValues({ active_projects: 3 }),
    });

    const { secondaryKpis } = await getDashboardOverview(2026);

    expect(secondaryKpis[2].delta).toBe('Sin cambios respecto a 2025');
  });

  it('lists only non-deleted projects with beneficiaries recorded in the selected year', async () => {
    mockMetricsByYear({});

    await getDashboardOverview(2026);

    expect(prisma.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null, projectBeneficiaries: { some: { year: 2026 } } },
        select: expect.objectContaining({
          projectBeneficiaries: expect.objectContaining({ where: { year: 2026 } }),
        }),
      })
    );
  });

  it('sums direct and indirect children per project and in the total', async () => {
    mockMetricsByYear({});
    mockProjects([
      {
        id: 1,
        name: 'Playground',
        status: 'active',
        intensity: 'high',
        projectBeneficiaries: [
          {
            values: beneficiaryValueRows({
              directChildrenAdolescents: 30,
              indirectChildrenAdolescents: 12,
            }),
          },
        ],
      },
      {
        id: 2,
        name: 'Talleres',
        status: 'inactive',
        intensity: 'low',
        projectBeneficiaries: [
          {
            values: beneficiaryValueRows({
              directChildrenAdolescents: 5,
              indirectChildrenAdolescents: 0,
            }),
          },
        ],
      },
    ]);

    const { projects, projectsTotal } = await getDashboardOverview(2026);

    expect(projects).toEqual([
      { id: 1, name: 'Playground', status: 'active', intensity: 'high', beneficiaries: 42 },
      { id: 2, name: 'Talleres', status: 'inactive', intensity: 'low', beneficiaries: 5 },
    ]);
    expect(projectsTotal).toBe(47);
  });
});
