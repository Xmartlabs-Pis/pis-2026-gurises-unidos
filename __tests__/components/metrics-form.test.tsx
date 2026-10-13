import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MetricsForm } from '@/components/metrics/metrics-form';
import { METRIC_DEFINITIONS } from '@/lib/metrics/constants';

const { saveMock } = vi.hoisted(() => ({ saveMock: vi.fn() }));
vi.mock('@/app/actions/metrics', () => ({ saveMetricSettings: saveMock }));
vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));

const TOPICS = [
  { id: 1, name: 'Education', projectCount: 3, showPublicly: true },
  { id: 2, name: 'Health', projectCount: 1, showPublicly: false },
  { id: 3, name: 'Protection', projectCount: 0, showPublicly: false },
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

it('saves individual topic visibility changes', async () => {
  const toggle = screen.getByRole('switch', { name: /Health/ });
  expect(toggle.getAttribute('aria-checked')).toBe('false');
  fireEvent.click(toggle);
  expect(toggle.getAttribute('aria-checked')).toBe('true');
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() =>
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        year: 2025,
        topics: [
          { id: 1, showPublicly: true },
          { id: 2, showPublicly: true },
          { id: 3, showPublicly: false },
        ],
      })
    )
  );
});

it('disables empty topics and leaves their visibility unchanged when enabling all', () => {
  const emptyTopic = screen.getByRole('switch', { name: /Protection/ });
  expect(emptyTopic.getAttribute('aria-disabled')).toBe('true');
  fireEvent.click(screen.getByRole('switch', { name: 'Mostrar todas las temáticas' }));
  expect(emptyTopic.getAttribute('aria-checked')).toBe('false');
});

it('enables all topics and then hides their statistics together', () => {
  const toggle = screen.getByRole('switch', { name: 'Mostrar todas las temáticas' });
  fireEvent.click(toggle);
  expect(screen.getByRole('switch', { name: /Health/ }).getAttribute('aria-checked')).toBe('true');
  fireEvent.click(toggle);
  expect(screen.getByRole('switch', { name: /Health/ }).getAttribute('aria-checked')).toBe('false');
  expect(screen.getByRole('switch', { name: /Education/ }).getAttribute('aria-checked')).toBe(
    'false'
  );
});
