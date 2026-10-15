import { afterEach, describe, expect, it, vi } from 'vitest';
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
  status: 'inactive',
  intensity: 'high',
  counterpartyType: 'publicSector',
  startYear: '2020',
  endYear: '2022',
  leadCoordinatorId: '1',
  geographicScope: 'national',
  departmentIds: ['1'],
  countries: [],
  cities: [],
  neighborhoods: [],
  zone: 'city',
};

it.each([
  [
    'ends before it starts',
    { endYear: '2019' },
    'El año de fin no puede ser anterior al año de inicio',
  ],
  [
    'is inactive without an end year',
    { endYear: '' },
    'El año de fin es obligatorio para proyectos inactivos',
  ],
  [
    'has an end year without being inactive',
    { status: 'active' },
    'Solo los proyectos inactivos tienen año de fin',
  ],
])('projectSchema rejects a project that %s', (_case, overrides, message) => {
  const result = projectSchema.safeParse({ ...BASE_PROJECT, ...overrides });
  expect(result.success).toBe(false);
  expect(result.error?.flatten().fieldErrors.endYear).toEqual([message]);
});

it('projectSchema accepts an end year equal to or after the start year, or none while not inactive', () => {
  expect(projectSchema.safeParse(BASE_PROJECT).success).toBe(true);
  expect(projectSchema.safeParse({ ...BASE_PROJECT, endYear: '2020' }).success).toBe(true);
  expect(projectSchema.safeParse({ ...BASE_PROJECT, status: 'active', endYear: '' }).success).toBe(
    true
  );
});

it('validates a custom beneficiary category and splits it into the counts', () => {
  const keys = [...BENEFICIARY_CATEGORY_KEYS, 'customVolunteers'];
  const schema = buildProjectFormSchema(keys);
  const input = {
    ...BASE_PROJECT,
    topicId: '1',
    year: '2021',
    strategicLineIds: ['1'],
    customVolunteers: '12',
  };

  const negative = schema.safeParse({ ...input, customVolunteers: '-1' });
  expect(negative.error?.flatten().fieldErrors).toEqual({
    customVolunteers: ['No puede ser negativo'],
  });

  const { projectData, beneficiaryData, strategicLineIds } = splitProjectFormData(
    schema.parse(input),
    keys
  );
  expect(strategicLineIds).toEqual([1]);
  expect(projectData).not.toHaveProperty('strategicLineIds');
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

it('requires between one and three unique strategic lines', () => {
  const schema = buildProjectFormSchema(BENEFICIARY_CATEGORY_KEYS);
  const input = {
    ...BASE_PROJECT,
    status: 'active',
    endYear: '',
    topicId: '1',
    year: '2020',
  };

  expect(schema.parse({ ...input, strategicLineIds: ['7'] }).strategicLineIds).toEqual([7]);
  expect(schema.parse({ ...input, strategicLineIds: ['7', '8', '9'] }).strategicLineIds).toEqual([
    7, 8, 9,
  ]);
  expect(
    schema.safeParse({ ...input, strategicLineIds: [] }).error?.flatten().fieldErrors
      .strategicLineIds
  ).toEqual(['Seleccioná al menos una línea estratégica']);
  expect(
    schema.safeParse({ ...input, strategicLineIds: ['1', '2', '3', '4'] }).error?.flatten()
      .fieldErrors.strategicLineIds
  ).toEqual(['Podés seleccionar hasta 3 líneas estratégicas']);
  expect(
    schema.safeParse({ ...input, strategicLineIds: ['7', '7'] }).error?.flatten().fieldErrors
      .strategicLineIds
  ).toEqual(['No repitas líneas estratégicas']);
});

describe('geographic scope', () => {
  const schema = buildProjectFormSchema(BENEFICIARY_CATEGORY_KEYS);
  const input = {
    ...BASE_PROJECT,
    status: 'active',
    endYear: '',
    topicId: '1',
    year: '2020',
    strategicLineIds: ['1'],
  };

  it('requires at least one department for a national project', () => {
    expect(
      schema.safeParse({ ...input, departmentIds: [] }).error?.flatten().fieldErrors.departmentIds
    ).toEqual(['Seleccioná al menos un departamento']);
  });

  it('requires at least one country for an international project', () => {
    expect(
      schema
        .safeParse({ ...input, geographicScope: 'international', departmentIds: [] })
        .error?.flatten().fieldErrors.countries
    ).toEqual(['Ingresá al menos un país']);
  });

  it('rejects a missing or invalid scope', () => {
    for (const geographicScope of [undefined, '', 'regional']) {
      expect(
        schema.safeParse({ ...input, geographicScope }).error?.flatten().fieldErrors.geographicScope
      ).toEqual(['Seleccioná un alcance geográfico']);
    }
  });

  it('accepts several departments, cities and neighborhoods trimming blank values', () => {
    const parsed = schema.parse({
      ...input,
      departmentIds: ['1', '2'],
      cities: [' Las Piedras ', '', 'Pando'],
      neighborhoods: ['Centro'],
    });
    expect(parsed).toMatchObject({
      departmentIds: [1, 2],
      cities: ['Las Piedras', 'Pando'],
      neighborhoods: ['Centro'],
    });
  });

  it('rejects repeated departments and place names ignoring case', () => {
    const errors = schema
      .safeParse({
        ...input,
        departmentIds: ['1', '1'],
        cities: ['Pando', 'pando'],
        neighborhoods: ['Centro', 'CENTRO'],
      })
      .error?.flatten().fieldErrors;
    expect(errors).toMatchObject({
      departmentIds: ['No repitas departamentos'],
      cities: ['No repitas ciudades'],
      neighborhoods: ['No repitas barrios'],
    });
    expect(
      schema
        .safeParse({
          ...input,
          geographicScope: 'international',
          countries: ['Brasil', 'brasil'],
        })
        .error?.flatten().fieldErrors.countries
    ).toEqual(['No repitas países']);
  });

  it('bounds each place name to 100 characters', () => {
    expect(schema.safeParse({ ...input, cities: ['a'.repeat(100)] }).success).toBe(true);
    expect(
      schema.safeParse({ ...input, cities: ['a'.repeat(101)] }).error?.flatten().fieldErrors.cities
    ).toEqual(['Máx. 100 caracteres por valor']);
  });

  it('keeps only national values for a national project', () => {
    const { projectData, departmentIds } = splitProjectFormData(
      schema.parse({
        ...input,
        countries: ['Brasil'],
        cities: ['Pando'],
        neighborhoods: ['Centro'],
      }),
      BENEFICIARY_CATEGORY_KEYS
    );
    expect(departmentIds).toEqual([1]);
    expect(projectData).toMatchObject({
      geographicScope: 'national',
      countries: [],
      cities: ['Pando'],
      neighborhoods: ['Centro'],
    });
    expect(projectData).not.toHaveProperty('departmentIds');
  });

  it('drops neighborhoods when no city is loaded', () => {
    const { projectData } = splitProjectFormData(
      schema.parse({ ...input, neighborhoods: ['Centro'] }),
      BENEFICIARY_CATEGORY_KEYS
    );
    expect(projectData).toMatchObject({ cities: [], neighborhoods: [] });
  });

  it('keeps only the countries for an international project', () => {
    const { projectData, departmentIds } = splitProjectFormData(
      schema.parse({
        ...input,
        geographicScope: 'international',
        countries: ['Argentina', 'Brasil'],
        cities: ['Pando'],
        neighborhoods: ['Centro'],
      }),
      BENEFICIARY_CATEGORY_KEYS
    );
    expect(departmentIds).toEqual([]);
    expect(projectData).toMatchObject({
      geographicScope: 'international',
      countries: ['Argentina', 'Brasil'],
      cities: [],
      neighborhoods: [],
    });
  });
});
