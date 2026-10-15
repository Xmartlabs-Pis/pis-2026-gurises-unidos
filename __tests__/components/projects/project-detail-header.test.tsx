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
  localityNeighborhood: 'Casavalle',
  generalObjective: 'Support adolescents and families.',
  publicDescription: 'Community support project.',
  coverPhoto: null,
  leadCoordinator: { id: 7, firstName: 'Ana', lastName: 'García' },
  department: { id: 1, name: 'Montevideo' },
  topics: [{ id: 1, name: 'Educación' }],
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

test('shows the end year of a finished project', () => {
  renderHeader(2023);

  expect(screen.getByText('2020–2023')).toBeDefined();
});
