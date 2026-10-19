import { render, screen } from '@testing-library/react';
import { beforeEach, expect, test, vi } from 'vitest';
import { TopbarProvider } from '@/components/layout/topbar-context';

const { getProjectDetailMock, notFoundMock } = vi.hoisted(() => ({
  getProjectDetailMock: vi.fn(),
  notFoundMock: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));

vi.mock('@/lib/projects/detail', () => ({
  getProjectDetail: getProjectDetailMock,
}));
vi.mock('next/navigation', () => ({
  notFound: notFoundMock,
  usePathname: () => '/dashboard/projects/42',
  useRouter: () => ({ push: vi.fn() }),
}));

import ProjectDetailPage from '@/app/(protected)/dashboard/projects/[id]/page';

const DETAIL = {
  status: 'success',
  data: {
    project: {
      id: 42,
      name: 'El Resorte',
      status: 'active',
      intensity: 'high',
      counterpartyType: 'publicSector',
      startYear: 2024,
      endYear: null,
      strategicLines: [{ id: 1, name: 'Formación' }],
      leadCoordinatorId: 7,
      zone: 'city',
      geographicScope: 'national',
      countries: [],
      cities: ['Montevideo'],
      neighborhoods: ['Casavalle'],
      generalObjective: 'Support adolescents and families.',
      publicDescription: 'Community support project.',
      coverPhoto: '/images/project-placeholders/1.webp',
      leadCoordinator: { id: 7, firstName: 'Ana', lastName: 'García' },
      departments: [{ id: 1, name: 'Montevideo' }],
      topics: [{ id: 1, name: 'Educación' }],
    },
    selectedYear: 2026,
    comparisonYear: 2025,
    availableYears: [2026, 2025],
    hasData: true,
    canEdit: true,
    metrics: {
      childrenReached: {
        value: 100,
        previousValue: 82,
        absoluteChange: 18,
        percentageChange: 22,
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
      annualGrowth: 22,
    },
    distribution: [
      { key: 'directChildrenAdolescents', label: 'NNA directos', value: 80 },
      { key: 'indirectChildrenAdolescents', label: 'NNA indirectos', value: 20 },
      { key: 'youth18To29', label: 'Jóvenes (18 a 29)', value: 10 },
      { key: 'families', label: 'Familias', value: 25 },
      { key: 'coordinatedInstitutions', label: 'Instituciones coordinadas', value: 5 },
      { key: 'communityLeaders', label: 'Referentes comunitarios', value: 12 },
      { key: 'basicServiceStaff', label: 'Personal de servicios básicos', value: 18 },
    ],
    institutionalContribution: {
      nationalReach: { projectValue: 100, nationalValue: 1250, percentage: 8 },
      activeProjects: { projectCount: 1, totalCount: 27 },
      territories: {
        count: 1,
        items: [
          {
            departments: [{ id: 1, name: 'Montevideo' }],
            zone: 'city',
            geographicScope: 'national',
            countries: [],
            cities: ['Montevideo'],
            neighborhoods: ['Casavalle'],
          },
        ],
      },
    },
  },
};

beforeEach(() => {
  getProjectDetailMock.mockReset();
  notFoundMock.mockReset();
  notFoundMock.mockImplementation(() => {
    throw new Error('NEXT_NOT_FOUND');
  });
  getProjectDetailMock.mockResolvedValue(DETAIL);
});

test('renders the selected project year and its main sections', async () => {
  render(
    <TopbarProvider>
      {await ProjectDetailPage({
        params: Promise.resolve({ id: '42' }),
        searchParams: Promise.resolve({ year: '2026' }),
      })}
    </TopbarProvider>
  );

  expect(getProjectDetailMock).toHaveBeenCalledWith('42', '2026');
  expect(screen.getByRole('heading', { level: 1, name: 'El Resorte' })).toBeDefined();
  expect(screen.getByText('Líneas estratégicas:')).toBeDefined();
  expect(screen.getByText('Formación')).toBeDefined();
  expect(screen.getByRole('region', { name: 'Métricas del proyecto' })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Distribución de beneficiarios' })).toBeDefined();
  expect(screen.getByRole('heading', { name: 'Contribución institucional' })).toBeDefined();
  expect(screen.queryByRole('heading', { name: 'Actividad reciente' })).toBeNull();
  expect(screen.getByText('Año de los datos').parentElement?.className).toContain('md:hidden');
  expect(screen.getByRole('combobox', { name: 'Seleccionar año' })).toBeDefined();
  expect(screen.getAllByText('Taller de convivencia grupal')).toHaveLength(2);
  expect(screen.getByRole('link', { name: 'Editar proyecto' }).getAttribute('href')).toBe(
    '/dashboard/projects/42/edit'
  );
  expect(screen.getByRole('link', { name: 'Ver vista pública →' }).getAttribute('href')).toBe('/');
});

test('returns not found for invalid project input', async () => {
  getProjectDetailMock.mockResolvedValue({ status: 'invalidInput', field: 'projectId' });

  await expect(
    ProjectDetailPage({
      params: Promise.resolve({ id: 'invalid' }),
      searchParams: Promise.resolve({}),
    })
  ).rejects.toThrow('NEXT_NOT_FOUND');

  expect(getProjectDetailMock).toHaveBeenCalledWith('invalid', undefined);
});

test('returns not found when the project does not exist', async () => {
  getProjectDetailMock.mockResolvedValue({ status: 'notFound' });

  await expect(
    ProjectDetailPage({
      params: Promise.resolve({ id: '42' }),
      searchParams: Promise.resolve({}),
    })
  ).rejects.toThrow('NEXT_NOT_FOUND');
});
