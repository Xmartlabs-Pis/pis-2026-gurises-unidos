import { render, screen } from '@testing-library/react';
import { expect, test, vi } from 'vitest';
import { ProjectDetailHeader } from '@/components/projects/detail/project-detail-header';
import type { ProjectDetail } from '@/lib/projects/detail';

vi.mock('next/navigation', () => ({
  usePathname: () => '/dashboard/projects/42',
  useRouter: () => ({ push: vi.fn() }),
}));

const PROJECT: ProjectDetail['project'] = {
  id: 42,
  name: 'El Resorte',
  status: 'active',
  intensity: 'high',
  startYear: 2020,
  endYear: null,
  strategicLines: [
    { id: 1, name: 'Formación' },
    { id: 2, name: 'Participación' },
  ],
  leadCoordinatorId: 7,
  zone: 'city',
  geographicScope: 'national',
  countries: [],
  cities: ['Montevideo'],
  neighborhoods: ['Casavalle'],
  generalObjective: 'Support adolescents and families.',
  publicDescription: 'Community support project.',
  coverPhoto: null,
  leadCoordinator: { id: 7, firstName: 'Ana', lastName: 'García' },
  departments: [{ id: 1, name: 'Montevideo' }],
  topic: { id: 1, name: 'Educación' },
};

function renderHeader(endYear: number | null) {
  render(
    <ProjectDetailHeader
      project={{ ...PROJECT, endYear }}
      selectedYear={2026}
      years={[2026]}
      canEdit={false}
    />
  );
}

test('shows an ongoing project period until the present', () => {
  renderHeader(null);

  expect(screen.getByText('2020–actualidad')).toBeDefined();
  expect(screen.getByText('Líneas estratégicas:')).toBeDefined();
  expect(screen.getByText('Formación, Participación')).toBeDefined();
});

test('shows the departments, cities and neighborhoods as the territory', () => {
  render(
    <ProjectDetailHeader
      project={{
        ...PROJECT,
        departments: [
          { id: 2, name: 'Canelones' },
          { id: 1, name: 'Montevideo' },
        ],
        cities: ['Las Piedras', 'Montevideo'],
        neighborhoods: ['Centro'],
      }}
      selectedYear={2026}
      years={[2026]}
      canEdit={false}
    />
  );

  expect(
    screen.getAllByText('Canelones, Montevideo — Las Piedras, Montevideo — Centro')
  ).not.toHaveLength(0);
});

test('shows the countries as the territory of an international project', () => {
  render(
    <ProjectDetailHeader
      project={{
        ...PROJECT,
        geographicScope: 'international',
        departments: [],
        countries: ['Argentina', 'Brasil'],
        cities: [],
        neighborhoods: [],
      }}
      selectedYear={2026}
      years={[2026]}
      canEdit={false}
    />
  );

  expect(screen.getAllByText('Argentina, Brasil')).not.toHaveLength(0);
});

test('shows the end year of a finished project', () => {
  renderHeader(2023);

  expect(screen.getByText('2020–2023')).toBeDefined();
});

test('shows the general objective and public description separately', () => {
  renderHeader(null);

  expect(screen.getByRole('heading', { name: 'Objetivo general' })).toBeDefined();
  expect(screen.getByText('Support adolescents and families.')).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Descripción pública' })).toBeDefined();
  expect(screen.getByText('Community support project.')).toBeDefined();
});
