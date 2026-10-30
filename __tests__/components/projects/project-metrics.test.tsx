import { render, screen, within } from '@testing-library/react';
import { expect, test } from 'vitest';
import { ProjectMetrics } from '@/components/projects/detail/project-metrics';

test('shows the current metrics and their year-over-year comparisons', () => {
  render(
    <ProjectMetrics
      metrics={{
        childrenReached: {
          value: 100,
          previousValue: 82,
          absoluteChange: 18,
          percentageChange: 21.951,
          trend: 'increased',
        },
        families: {
          value: 25,
          previousValue: 20,
          absoluteChange: 5,
          percentageChange: 25,
          trend: 'increased',
        },
        institutions: {
          value: 5,
          previousValue: 5,
          absoluteChange: 0,
          percentageChange: 0,
          trend: 'stable',
        },
        annualGrowth: 21.428571428571427,
      }}
      comparisonYear={2025}
    />
  );

  const metrics = within(screen.getByRole('region', { name: 'Métricas del proyecto' }));

  expect(metrics.getByText('100')).toBeDefined();
  expect(metrics.getByText('+18 vs. 2025')).toBeDefined();
  expect(metrics.getByText('+25% vs. año anterior')).toBeDefined();
  expect(metrics.getByText('Estable')).toBeDefined();
  expect(metrics.getByText('+21,4%')).toBeDefined();
});

test('shows unavailable comparisons without producing invalid percentages', () => {
  render(
    <ProjectMetrics
      metrics={{
        childrenReached: {
          value: 100,
          previousValue: null,
          absoluteChange: null,
          percentageChange: null,
          trend: null,
        },
        families: {
          value: 25,
          previousValue: null,
          absoluteChange: null,
          percentageChange: null,
          trend: null,
        },
        institutions: {
          value: 5,
          previousValue: null,
          absoluteChange: null,
          percentageChange: null,
          trend: null,
        },
        annualGrowth: null,
      }}
      comparisonYear={2025}
    />
  );

  expect(screen.getAllByText('Sin datos de 2025')).toHaveLength(3);
  expect(screen.getByText('—')).toBeDefined();
});

test('uses the absolute family increase when the previous year is zero', () => {
  render(
    <ProjectMetrics
      metrics={{
        childrenReached: {
          value: 100,
          previousValue: 90,
          absoluteChange: 10,
          percentageChange: 11.1,
          trend: 'increased',
        },
        families: {
          value: 50,
          previousValue: 0,
          absoluteChange: 50,
          percentageChange: null,
          trend: 'increased',
        },
        institutions: {
          value: 5,
          previousValue: 5,
          absoluteChange: 0,
          percentageChange: 0,
          trend: 'stable',
        },
        annualGrowth: 20,
      }}
      comparisonYear={2024}
    />
  );

  expect(screen.getByText('+50 vs. 2024')).toBeDefined();
  expect(screen.queryByText('Sin base de comparación')).toBeNull();
});
