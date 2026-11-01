import { expect, it } from 'vitest';
import { projectToFormValues } from '@/components/projects/form/project-to-form-values';
import { BENEFICIARY_CATEGORY_OPTIONS } from '../../mocks/beneficiary-values';

const PROJECT = {
  id: 10,
  name: 'Project',
  searchName: 'project',
  status: 'active' as const,
  intensity: 'high' as const,
  counterpartyType: 'publicSector' as const,
  startYear: 2024,
  endYear: null,
  leadCoordinatorId: 2,
  geographicScope: 'national' as const,
  countries: [],
  departments: [{ id: 3 }, { id: 5 }, { id: 7 }],
  localities: [
    { departmentId: 5, city: 'Las Piedras', neighborhood: 'Centro' },
    { departmentId: 3, city: 'Montevideo', neighborhood: null },
    { departmentId: 5, city: 'Las Piedras', neighborhood: 'Barrio Obrero' },
  ],
  zone: 'city' as const,
  generalObjective: null,
  publicDescription: null,
  internalNotes: null,
  showOnLanding: true,
  coverPhoto: '/cover.png',
  createdAt: new Date('2024-01-01'),
  createdBy: 1,
  updatedAt: null,
  deletedAt: null,
  deletedBy: null,
  topics: [{ id: 1 }, { id: 4 }],
  projectBeneficiaries: [
    {
      id: 1,
      projectId: 10,
      year: 2025,
      families: 30,
      directChildrenAdolescents: 10,
      indirectChildrenAdolescents: 20,
      youth18To29: 2,
      coordinatedInstitutions: 3,
      communityLeaders: 4,
      basicServiceStaff: 5,
      authorId: 1,
    },
  ],
};

it('defaults to the current year without copying historical beneficiary counts', () => {
  expect(projectToFormValues(PROJECT, 2026, BENEFICIARY_CATEGORY_OPTIONS)).toMatchObject({
    year: '2026',
    families: '0',
    directChildrenAdolescents: '0',
    topicIds: ['1', '4'],
    coverPhotoUrl: '/cover.png',
    internalNotes: '',
  });
});

it('maps all counts from the requested year without mutating the project', () => {
  const original = structuredClone(PROJECT);
  const values = projectToFormValues(PROJECT, 2025, BENEFICIARY_CATEGORY_OPTIONS);
  expect(values).toMatchObject({
    year: '2025',
    families: '30',
    directChildrenAdolescents: '10',
    indirectChildrenAdolescents: '20',
    youth18To29: '2',
    coordinatedInstitutions: '3',
    communityLeaders: '4',
    basicServiceStaff: '5',
  });
  expect(PROJECT).toEqual(original);
});

it.each(['publicSector', 'privateSector', 'internationalCooperation'] as const)(
  'loads the stored counterparty into form values: %s',
  (counterpartyType) => {
    const values = projectToFormValues(
      { ...PROJECT, counterpartyType },
      2026,
      BENEFICIARY_CATEGORY_OPTIONS
    );
    expect(values.counterpartyType).toBe(counterpartyType);
  }
);

it('loads the stored location into form values grouped by department', () => {
  expect(projectToFormValues(PROJECT, 2026, BENEFICIARY_CATEGORY_OPTIONS)).toMatchObject({
    geographicScope: 'national',
    countries: [],
    locations: [
      { departmentId: '3', city: 'Montevideo', neighborhood: '' },
      { departmentId: '5', city: 'Las Piedras', neighborhood: 'Centro' },
      { departmentId: '5', city: 'Las Piedras', neighborhood: 'Barrio Obrero' },
      { departmentId: '7', city: '', neighborhood: '' },
    ],
  });
  expect(
    projectToFormValues(
      {
        ...PROJECT,
        geographicScope: 'international',
        countries: ['Argentina'],
        departments: [],
        localities: [],
      },
      2026,
      BENEFICIARY_CATEGORY_OPTIONS
    )
  ).toMatchObject({
    geographicScope: 'international',
    countries: ['Argentina'],
    locations: [],
  });
});
