import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import Home from '@/app/(public)/page';
import { METRIC_DEFINITIONS } from '@/lib/metrics/constants';
import { getMetricSettings, getMetricValues, getPublishedYears } from '@/lib/metrics/queries';
import { getTopicStatistics } from '@/lib/metrics/topic-statistics';
import { ProjectsByTopic } from '@/components/projects/projects-by-topic';

const { pushMock } = vi.hoisted(() => ({ pushMock: vi.fn() }));

vi.mock('@/lib/metrics/queries', () => ({
  getPublishedYears: vi.fn(),
  getMetricSettings: vi.fn(),
  getMetricValues: vi.fn(),
}));
vi.mock('@/lib/projects/department-project-counts', () => ({
  getDepartmentProjectCounts: vi.fn(async () => []),
}));
vi.mock('@/lib/metrics/topic-statistics', () => ({
  getTopicStatistics: vi.fn(async () => []),
}));
vi.mock('@/components/projects/projects-by-topic', () => ({ ProjectsByTopic: vi.fn(() => null) }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getPublishedYears).mockResolvedValue([2025]);
  vi.mocked(getMetricSettings).mockResolvedValue(METRIC_DEFINITIONS);
  vi.mocked(getMetricValues).mockImplementation(async (year) => ({
    children_reached: year === 2025 ? 140 : 100,
    direct_children_reached: year === 2025 ? 100 : 50,
    indirect_children_reached: year === 2025 ? 40 : 50,
    families: 0,
    teachers: 0,
    institutions: 0,
    active_projects: 0,
  }));
});

test('shows separate child totals and year-over-year changes on the public page', async () => {
  render(await Home({ searchParams: Promise.resolve({}) }));

  const stats = within(screen.getByRole('group', { name: 'Impacto 2025' }));
  const direct = within(stats.getByText('NNA directos').parentElement!);
  const indirect = within(stats.getByText('NNA indirectos').parentElement!);

  expect(direct.getByText('100')).toBeDefined();
  expect(direct.getByText('+100% vs. 2024')).toBeDefined();
  expect(indirect.getByText('40')).toBeDefined();
  expect(indirect.getByText('-20% vs. 2024')).toBeDefined();
  const total = within(stats.getByText('Total de NNA').parentElement!);
  expect(total.getByText('140')).toBeDefined();
  expect(total.getByText('+40% vs. 2024')).toBeDefined();
});

test('hides the combined child metric independently of direct and indirect totals', async () => {
  vi.mocked(getMetricSettings).mockResolvedValue(
    METRIC_DEFINITIONS.map((metric) => ({
      ...metric,
      showPublicly: metric.key !== 'children_reached' && metric.showPublicly,
    }))
  );
  render(await Home({ searchParams: Promise.resolve({}) }));
  const stats = within(screen.getByRole('group', { name: 'Impacto 2025' }));
  expect(stats.queryByText('Total de NNA')).toBeNull();
  expect(stats.getByText('NNA directos')).toBeDefined();
  expect(stats.getByText('NNA indirectos')).toBeDefined();
});

test.each(['direct_children_reached', 'indirect_children_reached'])(
  'hides %s without hiding the other child metric',
  async (hiddenKey) => {
    vi.mocked(getMetricSettings).mockResolvedValue(
      METRIC_DEFINITIONS.map((metric) => ({
        ...metric,
        showPublicly: metric.key !== hiddenKey && metric.showPublicly,
      }))
    );
    render(await Home({ searchParams: Promise.resolve({}) }));

    const stats = within(screen.getByRole('group', { name: 'Impacto 2025' }));
    const hidesDirect = hiddenKey === 'direct_children_reached';
    expect(stats.queryByText(hidesDirect ? 'NNA directos' : 'NNA indirectos')).toBeNull();
    expect(stats.getByText(hidesDirect ? 'NNA indirectos' : 'NNA directos')).toBeDefined();
  }
);

test('offers only published years in the public selector', async () => {
  vi.mocked(getPublishedYears).mockResolvedValue([2026, 2024]);
  render(await Home({ searchParams: Promise.resolve({}) }));
  fireEvent.click(screen.getByRole('combobox', { name: 'Año del informe' }));
  const options = await screen.findAllByRole('option');
  expect(options.map((option) => option.textContent)).toEqual(['2026', '2024']);
  expect(screen.getByRole('group', { name: 'Impacto 2026' })).toBeDefined();
});

test('omits the selector when only one year is published', async () => {
  render(await Home({ searchParams: Promise.resolve({}) }));
  expect(screen.queryByRole('combobox', { name: 'Año del informe' })).toBeNull();
});

test('navigates to the selected published year without scrolling away', async () => {
  vi.mocked(getPublishedYears).mockResolvedValue([2026, 2024]);
  render(await Home({ searchParams: Promise.resolve({}) }));
  fireEvent.click(screen.getByRole('combobox', { name: 'Año del informe' }));
  const option = await screen.findByRole('option', { name: '2024' });
  fireEvent.pointerDown(option, { pointerType: 'mouse' });
  fireEvent.click(option);
  await waitFor(() => expect(pushMock).toHaveBeenCalledWith('/?year=2024', { scroll: false }));
});

test('uses the requested published year for all annual data', async () => {
  vi.mocked(getPublishedYears).mockResolvedValue([2026, 2024]);
  render(await Home({ searchParams: Promise.resolve({ year: '2024' }) }));
  expect(screen.getByRole('group', { name: 'Impacto 2024' })).toBeDefined();
  expect(getMetricValues).toHaveBeenNthCalledWith(1, 2024);
  expect(getMetricValues).toHaveBeenNthCalledWith(2, 2023);
  expect(getTopicStatistics).toHaveBeenCalledWith(2024);
  expect(ProjectsByTopic).toHaveBeenCalledWith(expect.objectContaining({ year: 2024 }), undefined);
});

test.each(['2025', '2030', 'invalid', ['2024', '2026']])(
  'falls back to the latest published year for an unavailable or invalid year %s',
  async (year) => {
    vi.mocked(getPublishedYears).mockResolvedValue([2026, 2024]);
    render(await Home({ searchParams: Promise.resolve({ year }) }));
    expect(screen.getByRole('group', { name: 'Impacto 2026' })).toBeDefined();
    expect(getMetricValues).toHaveBeenNthCalledWith(1, 2026);
  }
);
