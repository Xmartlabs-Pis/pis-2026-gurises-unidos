import { render, screen } from '@testing-library/react';
import { expect, test } from 'vitest';
import { HeroKpiCard } from '@/components/dashboard/hero-kpi-card';
import { ProjectsOverviewTable } from '@/components/dashboard/projects-overview-table';

test('shows the hero value as a plain total', () => {
  const { container } = render(
    <HeroKpiCard kpi={{ value: 1200, label: 'alcanzados', delta: '' }} />
  );

  expect(container.textContent).toContain('1.200');
  expect(container.textContent).not.toContain('+');
});

test('shows an empty state when no project has records for the year', () => {
  render(<ProjectsOverviewTable projects={[]} total={0} year={2026} />);

  expect(screen.getByText('No hay proyectos con beneficiarios registrados en 2026.')).toBeDefined();
  expect(screen.queryByRole('table')).toBeNull();
  expect(screen.getByText('Total 2026')).toBeDefined();
});

test('links each project to its detail page', () => {
  render(
    <ProjectsOverviewTable
      projects={[
        { id: 7, name: 'Playground', status: 'inactive', intensity: 'high', beneficiaries: 42 },
      ]}
      total={42}
      year={2026}
    />
  );

  const links = screen.getAllByRole('link', { name: /Playground/ });
  expect(links.length).toBeGreaterThan(0);
  links.forEach((link) => expect(link.getAttribute('href')).toBe('/dashboard/projects/7'));
  expect(screen.getAllByText('Inactivo').length).toBeGreaterThan(0);
});
