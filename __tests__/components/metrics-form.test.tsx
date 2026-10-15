import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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
        children_reached: 140,
        direct_children_reached: 100,
        indirect_children_reached: 40,
        families: 20,
        teachers: 12,
        institutions: 5,
        departments: 2,
        active_projects: 3,
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

it('allows enabling empty topics without showing them in the preview', () => {
  const emptyTopic = screen.getByRole('switch', { name: /Protection/ });
  expect(emptyTopic.getAttribute('aria-disabled')).not.toBe('true');
  fireEvent.click(emptyTopic);
  expect(emptyTopic.getAttribute('aria-checked')).toBe('true');
  expect(within(screen.getByRole('complementary')).queryByText('Protection')).toBeNull();
});

it('includes empty topics when enabling or disabling all topics', () => {
  const emptyTopic = screen.getByRole('switch', { name: /Protection/ });
  fireEvent.click(screen.getByRole('switch', { name: 'Mostrar todas las temáticas' }));
  expect(emptyTopic.getAttribute('aria-checked')).toBe('true');
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

it('toggles direct and indirect children independently in the preview', () => {
  const preview = within(screen.getByRole('complementary'));
  expect(preview.getByText('100')).toBeDefined();
  expect(preview.getByText('40')).toBeDefined();

  const directCard = screen.getByLabelText('NNA directos').closest('article')!;
  const indirectCard = screen.getByLabelText('NNA indirectos').closest('article')!;
  fireEvent.click(within(directCard).getByRole('switch'));

  expect(preview.queryByText('NNA directos')).toBeNull();
  expect(preview.getByText('NNA indirectos')).toBeDefined();
  expect(preview.getByText('40')).toBeDefined();

  fireEvent.click(within(indirectCard).getByRole('switch'));

  expect(preview.queryByText('NNA indirectos')).toBeNull();
  expect(screen.getByLabelText('NNA directos')).toHaveProperty('value', '100');
  expect(screen.getByLabelText('NNA indirectos')).toHaveProperty('value', '40');

  fireEvent.click(screen.getByRole('button', { name: 'Restablecer valores' }));

  expect(within(directCard).getByRole('switch').getAttribute('aria-checked')).toBe('true');
  expect(within(indirectCard).getByRole('switch').getAttribute('aria-checked')).toBe('true');
  expect(preview.getByText('NNA directos')).toBeDefined();
  expect(preview.getByText('NNA indirectos')).toBeDefined();
  expect(preview.getByText('Departamentos')).toBeDefined();
  expect(preview.getByText('Proyectos con actividad')).toBeDefined();
  expect(preview.queryByText('Familias acompañadas')).toBeNull();
  expect(preview.queryByText('Funcionarios de servicios básicos')).toBeNull();
  expect(preview.queryByText('Instituciones vinculadas')).toBeNull();
});
