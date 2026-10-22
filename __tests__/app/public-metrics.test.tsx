import { render, screen, within } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import Home from '@/app/(public)/page';
import { METRIC_DEFINITIONS } from '@/lib/metrics/constants';
import { getMetricSettings, getMetricValues } from '@/lib/metrics/queries';

vi.mock('@/lib/metrics/queries', () => ({
  getReferenceYear: vi.fn(async () => 2025),
  getMetricSettings: vi.fn(),
  getMetricValues: vi.fn(),
}));
vi.mock('@/lib/projects/department-project-counts', () => ({
  getDepartmentProjectCounts: vi.fn(async () => []),
}));
vi.mock('@/lib/metrics/topic-statistics', () => ({
  getTopicStatistics: vi.fn(async () => []),
}));
vi.mock('@/components/projects/projects-by-topic', () => ({ ProjectsByTopic: () => null }));

beforeEach(() => {
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
  render(await Home());

  const stats = within(screen.getByRole('group', { name: 'Impacto 2025' }));
  const direct = within(stats.getByText('NNA directos').parentElement!);
  const indirect = within(stats.getByText('NNA indirectos').parentElement!);

  expect(direct.getByText('100')).toBeDefined();
  expect(direct.getByText('+100% vs. 2024')).toBeDefined();
  expect(indirect.getByText('40')).toBeDefined();
  expect(indirect.getByText('-20% vs. 2024')).toBeDefined();
  expect(stats.queryByText('NNA alcanzados')).toBeNull();
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
    render(await Home());

    const stats = within(screen.getByRole('group', { name: 'Impacto 2025' }));
    const hidesDirect = hiddenKey === 'direct_children_reached';
    expect(stats.queryByText(hidesDirect ? 'NNA directos' : 'NNA indirectos')).toBeNull();
    expect(stats.getByText(hidesDirect ? 'NNA indirectos' : 'NNA directos')).toBeDefined();
  }
);
