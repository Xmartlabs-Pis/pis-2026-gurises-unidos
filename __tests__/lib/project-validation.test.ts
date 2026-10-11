import { afterEach, expect, it, vi } from 'vitest';
import { projectSchema } from '@/lib/validation/project';
import { beneficiaryYear, buildBeneficiaryCountsShape } from '@/lib/validation/project-beneficiary';
import { buildProjectFormSchema, splitProjectFormData } from '@/lib/validation/project-form';
import { parseId, MAX_INT32 } from '@/lib/validation/ids';
import { BENEFICIARY_CATEGORY_KEYS } from '../mocks/beneficiary-values';

afterEach(() => vi.useRealTimers());

it.each([
  null,
  undefined,
  true,
  false,
  '',
  ' ',
  '1.1',
  '1e2',
  '0x10',
  '01',
  -1,
  0,
  Infinity,
  MAX_INT32 + 1,
])('rejects invalid ids: %s', (value) => {
  expect(parseId(value)).toBeNull();
});
it('accepts integer ids at the boundary', () => {
  expect(parseId(String(MAX_INT32))).toBe(MAX_INT32);
});
it('validates years and defaults after midnight without reimporting the module', () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 11, 31, 23, 59));
  expect(projectSchema.shape.startYear.safeParse(2027).success).toBe(false);
  expect(beneficiaryYear.parse(undefined)).toBe(2026);
  vi.setSystemTime(new Date(2027, 0, 1, 0, 1));
  expect(projectSchema.shape.startYear.safeParse(2027).success).toBe(true);
  expect(beneficiaryYear.parse(undefined)).toBe(2027);
});
it.each([
  'directChildrenAdolescents',
  'indirectChildrenAdolescents',
  'youth18To29',
  'families',
  'coordinatedInstitutions',
  'communityLeaders',
  'basicServiceStaff',
] as const)('bounds %s to a Postgres integer', (field) => {
  const counts = buildBeneficiaryCountsShape(BENEFICIARY_CATEGORY_KEYS);
  expect(counts[field].safeParse(MAX_INT32).success).toBe(true);
  expect(counts[field].safeParse(MAX_INT32 + 1).success).toBe(false);
});
it.each([
  ['name', 100],
  ['localityNeighborhood', 100],
  ['generalObjective', 500],
  ['internalNotes', 1000],
  ['publicDescription', 1000],
] as const)('bounds %s text', (field, limit) => {
  expect(projectSchema.shape[field].safeParse('a'.repeat(limit)).success).toBe(true);
  expect(projectSchema.shape[field].safeParse('a'.repeat(limit + 1)).success).toBe(false);
});
it('requires one valid topic', () => {
  const schema = buildProjectFormSchema(BENEFICIARY_CATEGORY_KEYS).shape.topicId;
  expect(schema.parse('2')).toBe(2);
  for (const value of ['', 'none', undefined, null, 'invalid', '0', ['1', '2']])
    expect(schema.safeParse(value).success).toBe(false);
});
it('parses an empty end year as null and bounds it to valid years', () => {
  expect(projectSchema.shape.endYear.parse('')).toBeNull();
  expect(projectSchema.shape.endYear.parse(undefined)).toBeNull();
  expect(projectSchema.shape.endYear.parse('2020')).toBe(2020);
  expect(projectSchema.shape.endYear.safeParse('1988').success).toBe(false);
  expect(projectSchema.shape.endYear.safeParse(String(new Date().getFullYear() + 1)).success).toBe(
    false
  );
});

const BASE_PROJECT = {
  name: 'Project',
  status: 'closed',
  intensity: 'high',
  counterpartyType: 'publicSector',
  startYear: '2020',
  endYear: '2022',
  leadCoordinatorId: '1',
  departmentId: '1',
  zone: 'city',
};

it.each([
  [
    'ends before it starts',
    { endYear: '2019' },
    'El año de fin no puede ser anterior al año de inicio',
  ],
  [
    'is closed without an end year',
    { endYear: '' },
    'El año de fin es obligatorio para proyectos cerrados',
  ],
  [
    'has an end year without being closed',
    { status: 'active' },
    'Solo los proyectos cerrados tienen año de fin',
  ],
])('projectSchema rejects a project that %s', (_case, overrides, message) => {
  const result = projectSchema.safeParse({ ...BASE_PROJECT, ...overrides });
  expect(result.success).toBe(false);
  expect(result.error?.flatten().fieldErrors.endYear).toEqual([message]);
});

it('projectSchema accepts an end year equal to or after the start year, or none while not closed', () => {
  expect(projectSchema.safeParse(BASE_PROJECT).success).toBe(true);
  expect(projectSchema.safeParse({ ...BASE_PROJECT, endYear: '2020' }).success).toBe(true);
  expect(projectSchema.safeParse({ ...BASE_PROJECT, status: 'active', endYear: '' }).success).toBe(
    true
  );
});

it('validates a custom beneficiary category and splits it into the counts', () => {
  const keys = [...BENEFICIARY_CATEGORY_KEYS, 'customVolunteers'];
  const schema = buildProjectFormSchema(keys);
  const input = { ...BASE_PROJECT, topicId: '1', year: '2021', customVolunteers: '12' };

  const negative = schema.safeParse({ ...input, customVolunteers: '-1' });
  expect(negative.error?.flatten().fieldErrors).toEqual({
    customVolunteers: ['No puede ser negativo'],
  });

  const { projectData, beneficiaryData } = splitProjectFormData(schema.parse(input), keys);
  expect(beneficiaryData).toEqual({
    year: 2021,
    counts: {
      directChildrenAdolescents: 0,
      indirectChildrenAdolescents: 0,
      youth18To29: 0,
      families: 0,
      coordinatedInstitutions: 0,
      communityLeaders: 0,
      basicServiceStaff: 0,
      customVolunteers: 12,
    },
  });
  expect(projectData).not.toHaveProperty('customVolunteers');
  expect(projectData).not.toHaveProperty('families');
  expect(projectData).toMatchObject({ name: 'Project', topicId: 1 });
});

it.each(['publicSector', 'privateSector', 'internationalCooperation'])(
  'accepts counterparty %s',
  (counterpartyType) => {
    const result = projectSchema.safeParse({ ...BASE_PROJECT, counterpartyType });
    expect(result.success).toBe(true);
    expect(result.data?.counterpartyType).toBe(counterpartyType);
  }
);

it.each(['', undefined, null, 'invalid'])(
  'rejects a missing or invalid counterparty: %s',
  (counterpartyType) => {
    const result = projectSchema.safeParse({ ...BASE_PROJECT, counterpartyType });
    expect(result.success).toBe(false);
    expect(result.error?.flatten().fieldErrors.counterpartyType).toEqual([
      'Seleccioná una contraparte válida',
    ]);
  }
);
