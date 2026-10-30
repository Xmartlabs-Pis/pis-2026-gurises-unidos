import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';

const { authMock, getDashboardOverviewMock, getMetricYearsMock, redirectMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  getDashboardOverviewMock: vi.fn(),
  getMetricYearsMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));
vi.mock('@/lib/dashboard/queries', () => ({ getDashboardOverview: getDashboardOverviewMock }));
vi.mock('@/lib/metrics/queries', () => ({ getMetricYears: getMetricYearsMock }));
vi.mock('@/components/metrics/metrics-year-select', () => ({
  MetricsYearSelect: ({
    year,
    years,
    label,
  }: {
    year: number;
    years: number[];
    label?: string;
  }) => <p data-testid="year-select">{`${label}: ${year} de ${years.join(',')}`}</p>,
}));

import DashboardPage from '@/app/(protected)/dashboard/page';

function renderPage(year?: string | string[]) {
  return DashboardPage({ searchParams: Promise.resolve(year === undefined ? {} : { year }) });
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-09-29T12:00:00.000Z'));
  authMock.mockReset();
  getDashboardOverviewMock.mockReset();
  getMetricYearsMock.mockReset();
  redirectMock.mockClear();
  getMetricYearsMock.mockResolvedValue([2026, 2025, 2024]);
  getDashboardOverviewMock.mockResolvedValue({
    heroKpi: { value: 110, label: 'niños alcanzados', delta: '+10.0% vs. año anterior' },
    secondaryKpis: [
      { value: 30, label: 'familias', delta: '−25.0% vs. año anterior' },
      { value: 45, label: 'funcionarios', delta: 'Sin cambios vs. año anterior' },
      { value: 4, label: 'proyectos', delta: '−1 respecto a 2025' },
    ],
    projects: [
      { id: 7, name: 'Playground', status: 'active', intensity: 'high', beneficiaries: 42 },
    ],
    projectsTotal: 42,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

test('redirects to login without a session', async () => {
  authMock.mockResolvedValue(null);

  await expect(renderPage()).rejects.toThrow('NEXT_REDIRECT:/login');
  expect(getDashboardOverviewMock).not.toHaveBeenCalled();
});

test('redirects users whose role is not allowed', async () => {
  authMock.mockResolvedValue({ user: { id: '1', role: 'viewer' } });

  await expect(renderPage()).rejects.toThrow('NEXT_REDIRECT:/dashboard/projects');
  expect(getDashboardOverviewMock).not.toHaveBeenCalled();
});

test.each(['admin', 'coordinator'])(
  'renders the overview for the current year as %s',
  async (role) => {
    authMock.mockResolvedValue({ user: { id: '1', role } });

    render(await renderPage());

    expect(getMetricYearsMock).toHaveBeenCalledWith(2026);
    expect(getDashboardOverviewMock).toHaveBeenCalledWith(2026);
    expect(redirectMock).not.toHaveBeenCalled();
    expect(screen.getByText('niños alcanzados')).toBeDefined();
    expect(screen.getByText('−1 respecto a 2025')).toBeDefined();
    expect(screen.getAllByText('Playground').length).toBeGreaterThan(0);
    expect(screen.getByText('Total 2026')).toBeDefined();
  }
);

test('shows the overview for a selected year with data', async () => {
  authMock.mockResolvedValue({ user: { id: '1', role: 'coordinator' } });

  render(await renderPage('2024'));

  expect(getDashboardOverviewMock).toHaveBeenCalledWith(2024);
  expect(screen.getByTestId('year-select').textContent).toBe('Año: 2024 de 2026,2025,2024');
  expect(screen.getByText('Total 2024')).toBeDefined();
});

test.each([['1990'], ['2027'], ['abc'], ['2024.5'], [['2024', '2025']]])(
  'falls back to the current year for the invalid year %j',
  async (year) => {
    authMock.mockResolvedValue({ user: { id: '1', role: 'admin' } });

    render(await renderPage(year));

    expect(getDashboardOverviewMock).toHaveBeenCalledWith(2026);
    expect(screen.getByTestId('year-select').textContent).toBe('Año: 2026 de 2026,2025,2024');
  }
);

test.each(['admin', 'coordinator'])(
  'disables the actions that are not available yet as %s',
  async (role) => {
    authMock.mockResolvedValue({ user: { id: '1', role } });

    render(await renderPage());

    for (const name of ['Exportar reporte', 'Publicar dashboard']) {
      expect(screen.getByRole('button', { name }).hasAttribute('disabled')).toBe(true);
    }
    expect(screen.queryByText('Cargar métricas')).toBeNull();
    expect(screen.getByText('Nuevo proyecto').closest('a')?.getAttribute('href')).toBe(
      '/dashboard/projects/new'
    );
  }
);
