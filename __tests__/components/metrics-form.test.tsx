import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MetricsForm } from '@/components/metrics/metrics-form';
import { METRIC_DEFINITIONS } from '@/lib/metrics/constants';

const { saveMock } = vi.hoisted(() => ({ saveMock: vi.fn() }));
vi.mock('@/app/actions/metrics', () => ({ saveMetricSettings: saveMock }));
vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

const TOPICS = [
  { id: 1, name: 'Education', projectCount: 3, showPublicly: true },
  { id: 2, name: 'Health', projectCount: 0, showPublicly: false },
];

beforeEach(() => {
  saveMock.mockReset();
  saveMock.mockResolvedValue({ success: true, message: 'Saved' });
  render(
    <MetricsForm
      year="2025"
      values={{
        children_reached: 0,
        families: 0,
        teachers: 0,
        institutions: 0,
        departments: 0,
        active_projects: 0,
      }}
      initialMetrics={METRIC_DEFINITIONS}
      initialTopics={TOPICS}
    />
  );
});

it('previews only selected topics and saves individual visibility changes', async () => {
  const preview = within(screen.getByRole('complementary'));
  expect(preview.queryByText('Education')).not.toBeNull();
  expect(preview.queryByText('Health')).toBeNull();
  fireEvent.click(
    screen.getByRole('switch', { name: /Health/ })
  );
  expect(preview.queryByText('Health')).not.toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() =>
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        year: 2025,
        topics: [
          { id: 1, showPublicly: true },
          { id: 2, showPublicly: true },
        ],
      })
    )
  );
});

it('enables all topics and then hides their statistics together', () => {
  const toggle = screen.getByRole('switch', { name: 'Mostrar todas las temáticas' });
  const preview = within(screen.getByRole('complementary'));
  fireEvent.click(toggle);
  expect(preview.queryByText('Health')).not.toBeNull();
  fireEvent.click(toggle);
  expect(preview.queryByText('Health')).toBeNull();
  expect(preview.queryByText('Education')).toBeNull();
});
