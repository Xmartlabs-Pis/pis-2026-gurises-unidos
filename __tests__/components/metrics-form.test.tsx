import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { MetricsForm } from '@/components/metrics/metrics-form';
import { METRIC_DEFINITIONS } from '@/lib/metrics/constants';

const { saveMock } = vi.hoisted(() => ({ saveMock: vi.fn() }));
vi.mock('@/app/actions/metrics', () => ({ saveMetricSettings: saveMock }));
vi.mock('@/lib/notify', () => ({ notify: { success: vi.fn(), error: vi.fn() } }));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/management/metrics',
  useSearchParams: () => new URLSearchParams('year=2025'),
}));

const TOPICS = [
  { id: 1, name: 'Education', projectCount: 3, showPublicly: true },
  { id: 2, name: 'Health', projectCount: 1, showPublicly: false },
  { id: 3, name: 'Protection', projectCount: 0, showPublicly: false },
];

let rerender: ReturnType<typeof render>['rerender'];

beforeEach(() => {
  saveMock.mockReset();
  saveMock.mockResolvedValue({ success: true, message: 'Saved' });
  ({ rerender } = render(
    <MetricsForm
      year="2025"
      years={[2026, 2025, 2024]}
      initialPublishedYears={[2026, 2024]}
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
  ));
});

it('preserves pending edits while updating annual values and topic counts', async () => {
  const totalCard = screen.getByLabelText('Total de NNA').closest('article')!;
  fireEvent.click(within(totalCard).getByRole('switch'));
  fireEvent.click(screen.getByRole('switch', { name: /Health/ }));
  fireEvent.click(screen.getByRole('checkbox', { name: '2024' }));

  const nextProps = {
    year: '2024',
    years: [2026, 2025, 2024],
    initialPublishedYears: [2026, 2024],
    initialMetrics: METRIC_DEFINITIONS,
    initialTopics: TOPICS.map((topic) => ({ ...topic, projectCount: topic.id * 7 })),
    values: {
      children_reached: 400,
      direct_children_reached: 300,
      indirect_children_reached: 100,
      families: 60,
      teachers: 30,
      institutions: 15,
      departments: 8,
      active_projects: 12,
    },
  };
  rerender(<MetricsForm {...nextProps} />);

  expect(screen.getByLabelText('Total de NNA')).toHaveProperty('value', '400');
  expect(screen.getByRole('checkbox', { name: '2024' }).getAttribute('aria-checked')).toBe('false');
  expect(screen.getByRole('switch', { name: /Health/ }).getAttribute('aria-checked')).toBe('true');
  const preview = within(screen.getByRole('complementary'));
  expect(preview.queryByText('Total de NNA')).toBeNull();
  expect(preview.getByText('Impacto 2024')).toBeDefined();
  expect(preview.getByText('300')).toBeDefined();
  expect(preview.getByText('14')).toBeDefined();

  rerender(<MetricsForm {...nextProps} year="2025" initialTopics={TOPICS} />);
  expect(preview.getByText('Impacto 2025')).toBeDefined();
  expect(preview.getByText('1')).toBeDefined();
  expect(preview.queryByText('Total de NNA')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() =>
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        publishedYears: [2026],
        metrics: expect.arrayContaining([{ key: 'children_reached', showPublicly: false }]),
        topics: expect.arrayContaining([{ id: 2, showPublicly: true }]),
      })
    )
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
        publishedYears: [2026, 2024],
        topics: [
          { id: 1, showPublicly: true },
          { id: 2, showPublicly: true },
          { id: 3, showPublicly: false },
        ],
      })
    )
  );
});

it('shows pending changes only while the selection differs from the saved settings', () => {
  const saveButton = screen.getByRole('button', { name: 'Guardar cambios' });
  expect(saveButton).toHaveProperty('disabled', true);
  expect(screen.queryByText('Cambios sin guardar')).toBeNull();
  const toggle = screen.getByRole('switch', { name: /Health/ });
  fireEvent.click(toggle);
  expect(screen.getByText('Cambios sin guardar')).toBeDefined();
  expect(saveButton).toHaveProperty('disabled', false);
  fireEvent.click(toggle);
  expect(screen.queryByText('Cambios sin guardar')).toBeNull();
  expect(saveButton).toHaveProperty('disabled', true);
});

it('clears the pending indicator after saving and detects subsequent edits', async () => {
  const toggle = screen.getByRole('checkbox', { name: '2024' });
  fireEvent.click(toggle);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(screen.queryByText('Cambios sin guardar')).toBeNull());
  expect(await screen.findByRole('button', { name: 'Guardar cambios' })).toHaveProperty(
    'disabled',
    true
  );
  fireEvent.click(toggle);
  expect(screen.getByText('Cambios sin guardar')).toBeDefined();
});

it('keeps the pending indicator when saving fails', async () => {
  saveMock.mockResolvedValue({ success: false, message: 'Save failed' });
  fireEvent.click(screen.getByRole('switch', { name: /Health/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() => expect(saveMock).toHaveBeenCalled());
  expect(screen.getByText('Cambios sin guardar')).toBeDefined();
});

it('loads saved years and saves a changed selection independently of the preview', async () => {
  const year2026 = screen.getByRole('checkbox', { name: '2026' });
  const year2025 = screen.getByRole('checkbox', { name: '2025' });
  const year2024 = screen.getByRole('checkbox', { name: '2024' });
  expect(year2026.getAttribute('aria-checked')).toBe('true');
  expect(year2025.getAttribute('aria-checked')).toBe('false');
  expect(year2024.getAttribute('aria-checked')).toBe('true');
  fireEvent.click(year2024);
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() =>
    expect(saveMock).toHaveBeenCalledWith(expect.objectContaining({ publishedYears: [2026] }))
  );
  expect(saveMock.mock.calls[0][0]).not.toHaveProperty('year');
});

it('keeps at least one year selected when toggling all years', () => {
  const toggle = screen.getByRole('switch', { name: 'Publicar todos los años' });
  fireEvent.click(toggle);
  for (const year of ['2026', '2025', '2024']) {
    expect(screen.getByRole('checkbox', { name: year }).getAttribute('aria-checked')).toBe('true');
  }
  fireEvent.click(toggle);
  const latestYear = screen.getByRole('checkbox', { name: '2026' });
  expect(latestYear.getAttribute('aria-checked')).toBe('true');
  expect(latestYear.getAttribute('aria-disabled')).toBe('true');
  expect(screen.getByRole('checkbox', { name: '2025' }).getAttribute('aria-checked')).toBe('false');
  expect(screen.getByRole('checkbox', { name: '2024' }).getAttribute('aria-checked')).toBe('false');
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

it('toggles the combined child total in the preview and saves its visibility', async () => {
  const preview = within(screen.getByRole('complementary'));
  const metricCards = screen.getAllByRole('article');
  expect(within(metricCards[0]).getByText('Total de NNA')).toBeDefined();
  expect(screen.getByLabelText('Total de NNA')).toHaveProperty('value', '140');
  expect(preview.getByText('140')).toBeDefined();
  const totalCard = screen.getByLabelText('Total de NNA').closest('article')!;
  fireEvent.click(within(totalCard).getByRole('switch'));
  expect(preview.queryByText('Total de NNA')).toBeNull();
  expect(preview.getByText('NNA directos')).toBeDefined();
  expect(preview.getByText('NNA indirectos')).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Guardar cambios' }));
  await waitFor(() =>
    expect(saveMock).toHaveBeenCalledWith(
      expect.objectContaining({
        metrics: expect.arrayContaining([{ key: 'children_reached', showPublicly: false }]),
      })
    )
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

  expect(
    screen.getByRole('switch', { name: 'Publicar todos los años' }).getAttribute('aria-checked')
  ).toBe('true');
  expect(preview.getByText('Total de NNA')).toBeDefined();

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
