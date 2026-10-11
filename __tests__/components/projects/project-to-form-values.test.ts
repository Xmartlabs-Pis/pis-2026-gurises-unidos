import { expect, it } from 'vitest';
import { projectToFormValues } from '@/components/projects/form/project-to-form-values';
import { BENEFICIARY_CATEGORY_OPTIONS } from '../../mocks/beneficiary-values';

const PROJECT = {
  id: 10,
  name: 'Project',
  status: 'active' as const,
  intensity: 'high' as const,
  counterpartyType: 'publicSector' as const,
  startYear: 2024,
  endYear: null,
  leadCoordinatorId: 2,
  departmentId: 3,
  zone: 'city' as const,
  localityNeighborhood: null,
  generalObjective: null,
  publicDescription: null,
  internalNotes: null,
  coverPhoto: '/cover.png',
  createdAt: new Date('2024-01-01'),
  createdBy: 1,
  updatedAt: null,
  deletedAt: null,
  deletedBy: null,
  topicId: 1,
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
    topicId: '1',
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
