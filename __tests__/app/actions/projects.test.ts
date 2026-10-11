import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createProject, deleteProject, updateProject } from '@/app/actions/projects';
import { Prisma } from '@/generated/prisma/client';
import {
  buildProjectFormSchema,
  readProjectFormData,
  splitProjectFormData,
} from '@/lib/validation/project-form';
import { BENEFICIARY_CATEGORY_KEYS, beneficiaryValueRows } from '../../mocks/beneficiary-values';
import { formCategoryValuesWhere, toBeneficiaryValuesCreate } from '@/lib/project-display';
import { BENEFICIARY_VALUES_SELECT } from '@/lib/projects/beneficiary-values';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUser: vi.fn(),
  findCoordinator: vi.fn(),
  findProject: vi.fn(),
  findDuplicateProject: vi.fn(),
  findTopic: vi.fn(),
  transaction: vi.fn(),
  createProject: vi.fn(),
  updateProject: vi.fn(),
  softDeleteProject: vi.fn(),
  createBeneficiary: vi.fn(),
  findBeneficiary: vi.fn(),
  findLaterBeneficiary: vi.fn(),
  upsertBeneficiary: vi.fn(),
  deleteBeneficiaryValues: vi.fn(),
  audit: vi.fn(),
  queryRaw: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('@/lib/prisma', () => ({
  default: { $transaction: mocks.transaction, user: { findUnique: mocks.findUser } },
}));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock('@/lib/beneficiary-categories', async () => {
  const { BENEFICIARY_CATEGORY_OPTIONS } = await import('../../mocks/beneficiary-values');
  return { getActiveBeneficiaryCategories: async () => BENEFICIARY_CATEGORY_OPTIONS };
});

function lockedCategoryRows(strings: TemplateStringsArray, ...values: unknown[]) {
  if (!strings.join('').includes('"BeneficiaryCategory"')) return [];
  return (values[0] as string[]).map((key) => ({ key }));
}

const TX = {
  $queryRaw: mocks.queryRaw,
  project: {
    create: mocks.createProject,
    update: mocks.updateProject,
    updateMany: mocks.softDeleteProject,
    findFirst: vi.fn((args: { where: object }) =>
      'name' in args.where ? mocks.findDuplicateProject(args) : mocks.findProject(args)
    ),
  },
  user: { findFirst: mocks.findCoordinator },
  topic: { findFirst: mocks.findTopic },
  projectBeneficiary: {
    findFirst: mocks.findLaterBeneficiary,
    create: mocks.createBeneficiary,
    findUnique: mocks.findBeneficiary,
    upsert: mocks.upsertBeneficiary,
  },
  projectBeneficiaryValue: { deleteMany: mocks.deleteBeneficiaryValues },
  auditLog: { create: mocks.audit },
};
const VALID_DATA = {
  name: '  Updated project  ',
  topicId: '1',
  status: 'active',
  intensity: 'medium',
  counterpartyType: 'publicSector',
  startYear: '2019',
  leadCoordinatorId: '2',
  departmentId: '3',
  zone: 'city',
  localityNeighborhood: 'Neighborhood',
  generalObjective: 'Objective',
  publicDescription: 'Description',
  internalNotes: 'Team notes',
  year: '2024',
  directChildrenAdolescents: '42',
  indirectChildrenAdolescents: '68',
  youth18To29: '15',
  families: '30',
  coordinatedInstitutions: '6',
  communityLeaders: '12',
  basicServiceStaff: '8',
};

function formData(overrides: Record<string, string | undefined> = {}) {
  const data = new FormData();
  Object.entries({ ...VALID_DATA, ...overrides }).forEach(([key, value]) => {
    if (value !== undefined) data.set(key, value);
  });
  return data;
}

function databaseError(code: string, meta?: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('Database error', {
    code,
    clientVersion: '6',
    meta,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: '7', role: 'admin' } });
  mocks.findUser.mockResolvedValue({ id: 7, role: 'admin', status: 'active', deletedAt: null });
  mocks.findCoordinator.mockResolvedValue({ id: 2 });
  mocks.findProject.mockResolvedValue({ id: 10, leadCoordinatorId: 2, topicId: 1 });
  mocks.findTopic.mockResolvedValue({ id: 2 });
  mocks.findDuplicateProject.mockResolvedValue(null);
  mocks.queryRaw.mockImplementation(lockedCategoryRows);
  mocks.redirect.mockImplementation((path: string) => {
    throw new Error(`Redirect: ${path}`);
  });
  mocks.transaction.mockImplementation(async (callback) => callback(TX));
  mocks.createProject.mockResolvedValue({ id: 10 });
  mocks.updateProject.mockResolvedValue({ id: 10 });
  mocks.createBeneficiary.mockResolvedValue({ id: 20 });
  mocks.findBeneficiary.mockResolvedValue({ values: [] });
  mocks.findLaterBeneficiary.mockResolvedValue(null);
  mocks.upsertBeneficiary.mockResolvedValue({ id: 20 });
});

describe.each([
  ['createProject', (data: FormData) => createProject({}, data)],
  ['updateProject', (data: FormData) => updateProject(10, {}, data)],
] as const)('%s', (_name, submit) => {
  it.each([undefined, '', 'invalid'])(
    'rejects a missing or invalid counterparty before accessing the database: %s',
    async (counterpartyType) => {
      const result = await submit(formData({ counterpartyType }));
      expect(result.errors?.counterpartyType).toEqual(['Seleccioná una contraparte válida']);
      expect(mocks.transaction).not.toHaveBeenCalled();
    }
  );

  it('rejects a name that matches another project in the same year ignoring case', async () => {
    mocks.findDuplicateProject.mockResolvedValue({ id: 99 });
    const result = await submit(formData());
    expect(result).toEqual({
      errors: { name: ['Ya existe un proyecto con ese nombre y año de inicio'] },
    });
    expect(mocks.findDuplicateProject.mock.calls[0][0].where).toMatchObject({
      name: { equals: 'Updated project', mode: 'insensitive' },
      startYear: 2019,
      deletedAt: null,
    });
    expect(mocks.createProject).not.toHaveBeenCalled();
    expect(mocks.updateProject).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated users before accessing the database', async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(submit(formData())).rejects.toThrow('Redirect: /login');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each([
    ['name', ''],
    ['status', 'invalid'],
    ['departmentId', '0'],
    ['leadCoordinatorId', '0'],
    ['startYear', '1800'],
    ['year', '1800'],
    ['directChildrenAdolescents', '-1'],
    ['families', '1.5'],
    ['publicDescription', 'a'.repeat(1001)],
  ])('rejects invalid %s before writing', async (field, value) => {
    const result = await submit(formData({ [field]: value }));
    expect(result.errors?.[field]?.length).toBeGreaterThan(0);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each(['leadCoordinatorId', 'departmentId'])(
    'handles an invalid %s reference',
    async (field) => {
      mocks.transaction.mockRejectedValue(databaseError('P2003', { field_name: field }));
      expect(await submit(formData())).toEqual({
        formError: 'El coordinador o el departamento seleccionado no existe.',
      });
      expect(mocks.redirect).not.toHaveBeenCalled();
    }
  );

  it('reports a project with the same name and start year as a field error', async () => {
    mocks.transaction.mockRejectedValue(
      databaseError('P2002', { modelName: 'Project', target: ['name', 'startYear'] })
    );
    expect(await submit(formData())).toEqual({
      errors: { name: ['Ya existe un proyecto con ese nombre y año de inicio'] },
    });
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('does not report unrelated unique violations as a duplicate project', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.transaction.mockRejectedValue(databaseError('P2002', { target: ['topicId'] }));
    try {
      const result = await submit(formData());
      expect(result.errors).toBeUndefined();
      expect(result.formError).toBeDefined();
    } finally {
      spy.mockRestore();
    }
  });

  it.each([
    ['is before the start year', { status: 'closed', endYear: '2018' }],
    ['is set on a project that is not closed', { status: 'active', endYear: '2020' }],
    ['is before the first project year', { status: 'closed', endYear: '1988' }],
    ['is missing on a closed project', { status: 'closed', endYear: '' }],
  ])('rejects an end year that %s before writing', async (_case, overrides) => {
    const result = await submit(formData(overrides));
    expect(result.errors?.endYear?.length).toBeGreaterThan(0);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('accepts an end year equal to the start year on a closed project', async () => {
    await expect(
      submit(formData({ status: 'closed', endYear: '2019', year: '2019' }))
    ).rejects.toThrow('Redirect: /dashboard/projects/10');
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });

  it.each(['2023', '2024'])(
    'rejects beneficiary year %s after project closure before writing',
    async (year) => {
      const result = await submit(formData({ status: 'closed', endYear: '2022', year }));
      expect(result).toEqual({
        errors: { year: ['El año de beneficiarios no puede ser posterior al año de cierre'] },
      });
      expect(mocks.transaction).not.toHaveBeenCalled();
      expect(mocks.redirect).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    }
  );

  it.each(['2019', '2021', '2022'])(
    'accepts beneficiary year %s within the closed project period',
    async (year) => {
      await expect(submit(formData({ status: 'closed', endYear: '2022', year }))).rejects.toThrow(
        'Redirect: /dashboard/projects/10'
      );
      expect(mocks.transaction).toHaveBeenCalledTimes(1);
    }
  );

  it('handles stale session references', async () => {
    mocks.transaction.mockRejectedValue(databaseError('P2003', { constraint: 'authorId' }));
    expect(await submit(formData())).toEqual({
      formError: 'Tu sesión ya no es válida. Iniciá sesión de nuevo.',
    });
  });

  it('rejects stale beneficiary categories without writing', async () => {
    mocks.queryRaw.mockImplementation((strings: TemplateStringsArray, ...values: unknown[]) =>
      lockedCategoryRows(strings, ...values).slice(1)
    );
    expect(await submit(formData())).toEqual({
      formError: 'Las categorías de beneficiarios cambiaron. Recargá la página e intentá de nuevo.',
    });
    expect(mocks.queryRaw).toHaveBeenCalledWith(expect.anything(), BENEFICIARY_CATEGORY_KEYS);
    expect(mocks.createProject).not.toHaveBeenCalled();
    expect(mocks.updateProject).not.toHaveBeenCalled();
    expect(mocks.createBeneficiary).not.toHaveBeenCalled();
    expect(mocks.upsertBeneficiary).not.toHaveBeenCalled();
    expect(mocks.deleteBeneficiaryValues).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('returns an error without redirecting or revalidating when an audit write fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.audit.mockRejectedValue(new Error('Audit unavailable'));
    try {
      expect((await submit(formData())).formError).toBeDefined();
      expect(mocks.redirect).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});

it('creates the project and beneficiaries with audit entries in one transaction', async () => {
  await expect(createProject({}, formData())).rejects.toThrow('Redirect: /dashboard/projects/10');
  expect(mocks.transaction).toHaveBeenCalledTimes(1);
  expect(mocks.createProject).toHaveBeenCalledWith({
    data: expect.objectContaining({ name: 'Updated project', createdBy: 7 }),
  });
  expect(mocks.createBeneficiary).toHaveBeenCalledWith({
    data: expect.objectContaining({
      projectId: 10,
      year: 2024,
      authorId: 7,
      values: {
        create: expect.arrayContaining([{ value: 30, category: { connect: { key: 'families' } } }]),
      },
    }),
  });
  expect(mocks.audit).toHaveBeenCalledWith({
    data: { authorId: 7, action: 'creation', entity: 'project', entityId: 10 },
  });
  expect(mocks.audit).toHaveBeenCalledWith({
    data: {
      authorId: 7,
      action: 'creation',
      entity: 'beneficiary',
      entityId: 20,
      details: {
        year: 2024,
        values: {
          directChildrenAdolescents: 42,
          indirectChildrenAdolescents: 68,
          youth18To29: 15,
          families: 30,
          coordinatedInstitutions: 6,
          communityLeaders: 12,
          basicServiceStaff: 8,
        },
      },
    },
  });
});

describe('updateProject persistence', () => {
  it('rejects closing before an existing beneficiary year without writing', async () => {
    mocks.findLaterBeneficiary.mockResolvedValue({ year: 2024 });
    const result = await updateProject(
      10,
      {},
      formData({ status: 'closed', endYear: '2022', year: '2022' })
    );
    expect(result).toEqual({
      errors: {
        endYear: [
          'El año de cierre no puede ser anterior a 2024, que tiene beneficiarios registrados',
        ],
      },
    });
    expect(mocks.findLaterBeneficiary).toHaveBeenCalledWith({
      where: { projectId: 10, year: { gt: 2022 } },
      orderBy: { year: 'desc' },
      select: { year: true },
    });
    expect(mocks.updateProject).not.toHaveBeenCalled();
    expect(mocks.upsertBeneficiary).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, NaN, Infinity, 2_147_483_648])(
    'rejects invalid project id %s',
    async (id) => {
      expect(await updateProject(id, {}, formData())).toEqual({
        formError: 'El proyecto no es válido.',
      });
      expect(mocks.transaction).not.toHaveBeenCalled();
    }
  );

  it('reports missing projects', async () => {
    mocks.updateProject.mockRejectedValue(databaseError('P2025'));
    expect(await updateProject(10, {}, formData())).toEqual({
      formError: 'El proyecto no existe o fue eliminado.',
    });
    expect(mocks.upsertBeneficiary).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it.each([true, false])(
    'saves project fields and beneficiary counts with existing record: %s',
    async (exists) => {
      mocks.findBeneficiary.mockResolvedValue(exists ? { values: [] } : null);
      await expect(
        updateProject(10, {}, formData({ createdBy: '999', id: '999' }))
      ).rejects.toThrow('Redirect: /dashboard/projects/10');
      expect(mocks.updateProject).toHaveBeenCalledWith({
        where: { id: 10 },
        data: {
          name: 'Updated project',
          status: 'active',
          intensity: 'medium',
          counterpartyType: 'publicSector',
          startYear: 2019,
          endYear: null,
          leadCoordinatorId: 2,
          departmentId: 3,
          topicId: 1,
          zone: 'city',
          localityNeighborhood: 'Neighborhood',
          generalObjective: 'Objective',
          publicDescription: 'Description',
          internalNotes: 'Team notes',
        },
      });
      const values = toBeneficiaryValuesCreate({
        directChildrenAdolescents: 42,
        indirectChildrenAdolescents: 68,
        youth18To29: 15,
        families: 30,
        coordinatedInstitutions: 6,
        communityLeaders: 12,
        basicServiceStaff: 8,
      });
      expect(mocks.upsertBeneficiary).toHaveBeenCalledWith({
        where: { projectId_year: { projectId: 10, year: 2024 } },
        create: { year: 2024, projectId: 10, authorId: 7, values: { create: values } },
        update: {
          authorId: 7,
          recordedAt: expect.any(Date),
          values: { create: values },
        },
      });
      expect(mocks.deleteBeneficiaryValues).toHaveBeenCalledWith({
        where: formCategoryValuesWhere(10, 2024, BENEFICIARY_CATEGORY_KEYS),
      });
      expect(mocks.deleteBeneficiaryValues.mock.invocationCallOrder[0]).toBeLessThan(
        mocks.upsertBeneficiary.mock.invocationCallOrder[0]
      );
      expect(mocks.transaction).toHaveBeenCalledTimes(1);
      expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
        maxWait: 10_000,
        timeout: 30_000,
      });
      expect(mocks.findBeneficiary).toHaveBeenCalledWith({
        where: { projectId_year: { projectId: 10, year: 2024 } },
        select: BENEFICIARY_VALUES_SELECT,
      });
      expect(mocks.audit).toHaveBeenCalledTimes(2);
      expect(mocks.audit).toHaveBeenNthCalledWith(1, {
        data: {
          authorId: 7,
          action: 'update',
          entity: 'project',
          entityId: 10,
          details: { changedFields: expect.any(Array) },
        },
      });
      expect(mocks.audit).toHaveBeenNthCalledWith(2, {
        data: {
          authorId: 7,
          action: exists ? 'update' : 'creation',
          entity: 'beneficiary',
          entityId: 20,
          details: { year: 2024, changes: expect.any(Array) },
        },
      });
      expect(mocks.revalidatePath.mock.calls).toEqual([['/dashboard/projects', 'layout']]);
    }
  );

  it('clears optional text and resets blank counts to zero', async () => {
    await expect(
      updateProject(
        10,
        {},
        formData({
          generalObjective: '',
          publicDescription: '',
          internalNotes: '',
          localityNeighborhood: '',
          families: '',
        })
      )
    ).rejects.toThrow('Redirect:');
    expect(mocks.updateProject).toHaveBeenCalledWith({
      where: { id: 10 },
      data: expect.objectContaining({
        generalObjective: null,
        publicDescription: null,
        internalNotes: null,
        localityNeighborhood: null,
      }),
    });
    expect(mocks.upsertBeneficiary).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          values: {
            create: expect.not.arrayContaining([
              expect.objectContaining({ category: { connect: { key: 'families' } } }),
            ]),
          },
        }),
      })
    );
  });

  it('returns specific field errors together without accessing the database', async () => {
    const result = await updateProject(
      10,
      {},
      formData({
        name: '   ',
        status: 'cancelled',
        startYear: '1988',
        leadCoordinatorId: '-50',
        families: '-5',
        year: '1900',
      })
    );

    expect(result.errors).toMatchObject({
      name: ['El nombre es obligatorio'],
      status: expect.any(Array),
      startYear: ['Año inválido'],
      leadCoordinatorId: ['Elegí un coordinador'],
      families: ['No puede ser negativo'],
      year: ['Año inválido'],
    });
    expect(mocks.transaction).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('defaults omitted counts to zero and the beneficiary year to the current year', async () => {
    const year = new Date().getFullYear();
    mocks.findBeneficiary.mockResolvedValue(null);
    await expect(
      updateProject(
        10,
        {},
        formData({
          year: undefined,
          directChildrenAdolescents: undefined,
          indirectChildrenAdolescents: undefined,
          youth18To29: undefined,
          families: undefined,
          coordinatedInstitutions: undefined,
          communityLeaders: undefined,
          basicServiceStaff: undefined,
        })
      )
    ).rejects.toThrow('Redirect: /dashboard/projects/10');

    const values = toBeneficiaryValuesCreate({
      directChildrenAdolescents: 0,
      indirectChildrenAdolescents: 0,
      youth18To29: 0,
      families: 0,
      coordinatedInstitutions: 0,
      communityLeaders: 0,
      basicServiceStaff: 0,
    });
    expect(mocks.findBeneficiary).toHaveBeenCalledWith({
      where: { projectId_year: { projectId: 10, year } },
      select: BENEFICIARY_VALUES_SELECT,
    });
    expect(mocks.upsertBeneficiary).toHaveBeenCalledWith({
      where: { projectId_year: { projectId: 10, year } },
      create: { year, projectId: 10, authorId: 7, values: { create: values } },
      update: {
        authorId: 7,
        recordedAt: expect.any(Date),
        values: { create: values },
      },
    });
  });

  it.each(['transaction', 'upsertBeneficiary', 'audit'] as const)(
    'reports and logs unexpected %s failures without redirecting or revalidating',
    async (operation) => {
      const unexpectedError = new Error('Connection lost');
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mocks[operation].mockRejectedValue(unexpectedError);

      try {
        expect(await updateProject(10, {}, formData())).toEqual({
          formError: 'No se pudo actualizar el proyecto. Intentá de nuevo.',
        });
        expect(consoleErrorSpy).toHaveBeenCalledExactlyOnceWith(
          'Failed to update project',
          unexpectedError
        );
        expect(mocks.redirect).not.toHaveBeenCalled();
        expect(mocks.revalidatePath).not.toHaveBeenCalled();
      } finally {
        consoleErrorSpy.mockRestore();
      }
    }
  );
});

function unchangedRecords() {
  const { projectData, beneficiaryData } = splitProjectFormData(
    buildProjectFormSchema(BENEFICIARY_CATEGORY_KEYS).parse(readProjectFormData(formData())),
    BENEFICIARY_CATEGORY_KEYS
  );
  mocks.findProject.mockResolvedValue({ id: 10, ...projectData, topicId: 1 });
  mocks.findBeneficiary.mockResolvedValue({ values: beneficiaryValueRows(beneficiaryData.counts) });
}

describe('project review regressions', () => {
  it.each([
    { role: 'coordinator', id: 7 },
    { role: 'coordinator', id: 3 },
  ])('rejects an unrelated coordinator $id even with an admin JWT', async (user) => {
    mocks.findUser.mockResolvedValue({ ...user, status: 'active', deletedAt: null });
    expect(await updateProject(10, {}, formData())).toEqual({
      formError: 'No tenés permiso para editar este proyecto.',
    });
    expect(mocks.updateProject).not.toHaveBeenCalled();
    expect(mocks.upsertBeneficiary).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it('allows the current responsible coordinator', async () => {
    mocks.findUser.mockResolvedValue({
      id: 2,
      role: 'coordinator',
      status: 'active',
      deletedAt: null,
    });
    await expect(updateProject(10, {}, formData())).rejects.toThrow(
      'Redirect: /dashboard/projects/10'
    );
    expect(mocks.updateProject).toHaveBeenCalled();
  });

  it.each([
    null,
    { id: 7, role: 'admin', status: 'disabled', deletedAt: null },
    { id: 7, role: 'admin', status: 'active', deletedAt: new Date() },
  ])('rejects inactive or deleted session users', async (user) => {
    mocks.findUser.mockResolvedValue(user);
    await expect(updateProject(10, {}, formData())).rejects.toThrow('Redirect: /login');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('reports a project missing before the update', async () => {
    mocks.findProject.mockResolvedValue(null);
    expect((await updateProject(10, {}, formData())).formError).toBe(
      'El proyecto no existe o fue eliminado.'
    );
    expect(mocks.updateProject).not.toHaveBeenCalled();
  });

  it('only looks up projects that were not deleted', async () => {
    await expect(updateProject(10, {}, formData())).rejects.toThrow('Redirect:');
    expect(mocks.findProject).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10, deletedAt: null } })
    );
  });

  it('preserves the current coordinator without requiring its previous role', async () => {
    await expect(updateProject(10, {}, formData())).rejects.toThrow('Redirect:');
    expect(mocks.findCoordinator).toHaveBeenCalledWith({ where: { id: 2 }, select: { id: true } });
  });

  it.each([createProject.bind(null, {}), updateProject.bind(null, 10, {})])(
    'rejects invalid replacement coordinators before writing',
    async (submit) => {
      mocks.findCoordinator.mockResolvedValue(null);
      expect(await submit(formData({ leadCoordinatorId: '9' }))).toEqual({
        errors: { leadCoordinatorId: ['Elegí un coordinador válido'] },
      });
      expect(mocks.findCoordinator).toHaveBeenCalledWith({
        where: { id: 9, role: 'coordinator', status: 'active', deletedAt: null },
        select: { id: true },
      });
      expect(mocks.createProject).not.toHaveBeenCalled();
      expect(mocks.updateProject).not.toHaveBeenCalled();
      expect(mocks.upsertBeneficiary).not.toHaveBeenCalled();
    }
  );

  it('does not update timestamps or audit when normalized values are unchanged', async () => {
    unchangedRecords();
    await expect(updateProject(10, {}, formData())).rejects.toThrow('Redirect:');
    expect(mocks.updateProject).not.toHaveBeenCalled();
    expect(mocks.upsertBeneficiary).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it('audits only beneficiary changes with the year and previous and new values', async () => {
    unchangedRecords();
    await expect(updateProject(10, {}, formData({ families: '31' }))).rejects.toThrow('Redirect:');
    expect(mocks.updateProject).not.toHaveBeenCalled();
    expect(mocks.audit).toHaveBeenCalledExactlyOnceWith({
      data: {
        authorId: 7,
        action: 'update',
        entity: 'beneficiary',
        entityId: 20,
        details: { year: 2024, changes: [{ field: 'families', from: 30, to: 31 }] },
      },
    });
  });

  it('creates the selected year without updating another year', async () => {
    unchangedRecords();
    mocks.findBeneficiary.mockResolvedValue(null);
    await expect(updateProject(10, {}, formData({ year: '2026' }))).rejects.toThrow('Redirect:');
    expect(mocks.upsertBeneficiary).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId_year: { projectId: 10, year: 2026 } },
        create: expect.objectContaining({ year: 2026 }),
      })
    );
    expect(mocks.updateProject).not.toHaveBeenCalled();
  });

  it('saves one topic and audits a topic-only change', async () => {
    unchangedRecords();
    await expect(updateProject(10, {}, formData({ topicId: '2' }))).rejects.toThrow('Redirect:');
    expect(mocks.updateProject).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ topicId: 2 }) })
    );
    expect(mocks.audit).toHaveBeenCalledExactlyOnceWith({
      data: {
        authorId: 7,
        action: 'update',
        entity: 'project',
        entityId: 10,
        details: { changedFields: ['topicId'] },
      },
    });
    expect(mocks.upsertBeneficiary).not.toHaveBeenCalled();
  });

  it('creates a project with one topic', async () => {
    await expect(createProject({}, formData({ topicId: '2' }))).rejects.toThrow('Redirect:');
    expect(mocks.createProject).toHaveBeenCalledWith({
      data: expect.objectContaining({ topicId: 2 }),
    });
    expect(mocks.findTopic).toHaveBeenCalledWith({
      where: { id: 2, isActive: true },
      select: { id: true },
    });
  });

  it('rejects a nonexistent topic before any writes', async () => {
    mocks.findTopic.mockResolvedValue(null);
    expect(await updateProject(10, {}, formData({ topicId: '999' }))).toEqual({
      errors: { topicId: ['Elegí una temática válida'] },
    });
    expect(mocks.updateProject).not.toHaveBeenCalled();
    expect(mocks.upsertBeneficiary).not.toHaveBeenCalled();
  });

  it.each(['create', 'edit'])('rejects multiple submitted topics in %s mode', async (mode) => {
    const data = formData({ topicId: '2' });
    data.append('topicId', '4');
    const result =
      mode === 'create' ? await createProject({}, data) : await updateProject(10, {}, data);
    expect(result.errors?.topicId).toBeDefined();
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it.each(['', 'none', undefined])(
    'rejects an empty topic (%s) in create and edit',
    async (topicId) => {
      for (const action of [
        () => createProject({}, formData({ topicId })),
        () => updateProject(10, {}, formData({ topicId })),
      ]) {
        const result = await action();
        expect(result.errors?.topicId).toBeDefined();
      }
      expect(mocks.transaction).not.toHaveBeenCalled();
    }
  );

  it('preserves an unchanged topic without requiring it to be active or auditing', async () => {
    unchangedRecords();
    const { projectData } = splitProjectFormData(
      buildProjectFormSchema(BENEFICIARY_CATEGORY_KEYS).parse(readProjectFormData(formData())),
      BENEFICIARY_CATEGORY_KEYS
    );
    mocks.findProject.mockResolvedValue({ id: 10, ...projectData, topicId: 2 });
    await expect(updateProject(10, {}, formData({ topicId: '2' }))).rejects.toThrow('Redirect:');
    expect(mocks.findTopic).toHaveBeenCalledWith({ where: { id: 2 }, select: { id: true } });
    expect(mocks.updateProject).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it('ignores forged cover photo updates', async () => {
    await expect(
      updateProject(10, {}, formData({ coverPhoto: 'https://invalid.test/photo.png' }))
    ).rejects.toThrow('Redirect:');
    expect(mocks.updateProject.mock.calls[0][0].data).not.toHaveProperty('coverPhoto');
  });
});

describe('deleteProject', () => {
  beforeEach(() => {
    mocks.findProject.mockResolvedValue({ id: 10, leadCoordinatorId: 2 });
    mocks.softDeleteProject.mockResolvedValue({ count: 1 });
  });

  it('marks the project as deleted by the user and audits it in one transaction', async () => {
    expect(await deleteProject(10)).toEqual({});
    expect(mocks.findProject).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 10, deletedAt: null } })
    );
    expect(mocks.softDeleteProject).toHaveBeenCalledWith({
      where: { id: 10, deletedAt: null },
      data: { deletedAt: expect.any(Date), deletedBy: 7 },
    });
    expect(mocks.audit).toHaveBeenCalledWith({
      data: { authorId: 7, action: 'deletion', entity: 'project', entityId: 10 },
    });
    expect(mocks.revalidatePath).toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('allows the lead coordinator', async () => {
    mocks.findUser.mockResolvedValue({
      id: 2,
      role: 'coordinator',
      status: 'active',
      deletedAt: null,
    });
    expect(await deleteProject(10)).toEqual({});
    expect(mocks.softDeleteProject).toHaveBeenCalled();
  });

  it('rejects an unrelated coordinator', async () => {
    mocks.findUser.mockResolvedValue({
      id: 3,
      role: 'coordinator',
      status: 'active',
      deletedAt: null,
    });
    expect(await deleteProject(10)).toEqual({
      error: 'No tenés permiso para eliminar este proyecto.',
    });
    expect(mocks.softDeleteProject).not.toHaveBeenCalled();
    expect(mocks.audit).not.toHaveBeenCalled();
  });

  it('reports a missing or already deleted project', async () => {
    mocks.findProject.mockResolvedValue(null);
    expect(await deleteProject(10)).toEqual({
      error: 'El proyecto no existe o ya fue eliminado.',
    });
    expect(mocks.softDeleteProject).not.toHaveBeenCalled();
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('does not audit when a concurrent request already deleted the project', async () => {
    mocks.softDeleteProject.mockResolvedValue({ count: 0 });
    expect(await deleteProject(10)).toEqual({
      error: 'El proyecto no existe o ya fue eliminado.',
    });
    expect(mocks.audit).not.toHaveBeenCalled();
    expect(mocks.revalidatePath).not.toHaveBeenCalled();
  });

  it('rejects an invalid id before accessing the database', async () => {
    expect(await deleteProject(0)).toEqual({ error: 'El proyecto no es válido.' });
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated users before accessing the database', async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(deleteProject(10)).rejects.toThrow('Redirect: /login');
    expect(mocks.transaction).not.toHaveBeenCalled();
  });

  it('returns an error without redirecting or revalidating when the transaction fails', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mocks.audit.mockRejectedValue(new Error('Audit unavailable'));
    try {
      expect(await deleteProject(10)).toEqual({
        error: 'No se pudo eliminar el proyecto. Intentá de nuevo.',
      });
      expect(mocks.redirect).not.toHaveBeenCalled();
      expect(mocks.revalidatePath).not.toHaveBeenCalled();
    } finally {
      spy.mockRestore();
    }
  });
});
