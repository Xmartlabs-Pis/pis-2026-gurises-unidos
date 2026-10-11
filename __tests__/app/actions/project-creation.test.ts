import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { ProjectFormState } from '@/lib/validation/project';

const { authMock, redirectMock, logAuditMock, transactionMock, findUserMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  redirectMock: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
  logAuditMock: vi.fn(),
  transactionMock: vi.fn(),
  findUserMock: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('next/navigation', () => ({ redirect: redirectMock }));
vi.mock('@/lib/audit-log', () => ({ logAudit: logAuditMock }));
vi.mock('@/lib/prisma', () => ({
  default: {
    $transaction: transactionMock,
    user: { findUnique: findUserMock },
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/beneficiary-categories', async () => {
  const { BENEFICIARY_CATEGORY_OPTIONS } = await import('../../mocks/beneficiary-values');
  return { getActiveBeneficiaryCategories: async () => BENEFICIARY_CATEGORY_OPTIONS };
});

import { createProject } from '@/app/actions/projects';
import { Prisma } from '@/generated/prisma/client';
import { toBeneficiaryValuesCreate } from '@/lib/project-display';

const EMPTY_STATE: ProjectFormState = {};

type FormDataInput = Record<string, string | undefined>;

const VALID_FIELDS: FormDataInput = {
  name: 'Community Center',
  topicId: '1',
  status: 'active',
  intensity: 'high',
  counterpartyType: 'publicSector',
  startYear: '2020',
  leadCoordinatorId: '1',
  departmentId: '2',
  zone: 'city',
  localityNeighborhood: '',
  generalObjective: '',
  publicDescription: '',
  internalNotes: '',
  year: '2024',
  directChildrenAdolescents: '10',
  indirectChildrenAdolescents: '5',
  youth18To29: '3',
  families: '2',
  coordinatedInstitutions: '1',
  communityLeaders: '4',
  basicServiceStaff: '6',
};

function buildFormData(overrides: FormDataInput = {}): FormData {
  const fields = { ...VALID_FIELDS, ...overrides };
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      formData.append(key, value);
    }
  }
  return formData;
}

function setupTransaction({ projectId = 42, beneficiaryId = 9 } = {}) {
  const projectCreate = vi.fn().mockResolvedValue({ id: projectId });
  const beneficiaryCreate = vi.fn().mockResolvedValue({ id: beneficiaryId });

  transactionMock.mockImplementation(async (callback) =>
    callback({
      $queryRaw: vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) =>
        strings.join('').includes('"BeneficiaryCategory"')
          ? (values[0] as string[]).map((key) => ({ key }))
          : []
      ),
      user: { findFirst: vi.fn().mockResolvedValue({ id: 1 }) },
      topic: { findFirst: vi.fn().mockResolvedValue({ id: 1 }) },
      project: { create: projectCreate, findFirst: vi.fn().mockResolvedValue(null) },
      projectBeneficiary: { create: beneficiaryCreate },
    })
  );

  return { projectCreate, beneficiaryCreate };
}

function knownRequestError(code: string, meta: Record<string, unknown>) {
  return new Prisma.PrismaClientKnownRequestError('Prisma request failed', {
    code,
    clientVersion: '6.19.3',
    meta,
  });
}

beforeEach(() => {
  authMock.mockResolvedValue({ user: { id: '7' } });
  findUserMock.mockResolvedValue({ id: 7, role: 'admin', status: 'active', deletedAt: null });
  redirectMock.mockImplementation((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  });
});

describe('createProject', () => {
  test.each(['publicSector', 'privateSector', 'internationalCooperation'])(
    'creates a project with counterparty %s',
    async (counterpartyType) => {
      const { projectCreate } = setupTransaction();
      await expect(createProject(EMPTY_STATE, buildFormData({ counterpartyType }))).rejects.toThrow(
        'NEXT_REDIRECT:/dashboard/projects/42'
      );
      expect(projectCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ counterpartyType }),
      });
    }
  );

  test('redirects to /login and skips the database when there is no session', async () => {
    authMock.mockResolvedValue(null);

    await expect(createProject(EMPTY_STATE, buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/login'
    );

    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('returns field errors and skips the database when the form is invalid', async () => {
    const result = await createProject(
      EMPTY_STATE,
      buildFormData({
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
    expect(transactionMock).not.toHaveBeenCalled();
  });

  test('creates the project and its beneficiary record in one transaction, then redirects', async () => {
    const { projectCreate, beneficiaryCreate } = setupTransaction();

    await expect(createProject(EMPTY_STATE, buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/dashboard/projects/42'
    );

    expect(projectCreate).toHaveBeenCalledWith({
      data: {
        name: 'Community Center',
        status: 'active',
        intensity: 'high',
        counterpartyType: 'publicSector',
        startYear: 2020,
        endYear: null,
        leadCoordinatorId: 1,
        departmentId: 2,
        zone: 'city',
        localityNeighborhood: null,
        generalObjective: null,
        publicDescription: null,
        internalNotes: null,
        coverPhoto: expect.stringMatching(/^\/images\/project-placeholders\/[1-6]\.webp$/),
        createdBy: 7,
        topicId: 1,
      },
    });
    expect(beneficiaryCreate).toHaveBeenCalledWith({
      data: {
        year: 2024,
        projectId: 42,
        authorId: 7,
        values: {
          create: toBeneficiaryValuesCreate({
            directChildrenAdolescents: 10,
            indirectChildrenAdolescents: 5,
            youth18To29: 3,
            families: 2,
            coordinatedInstitutions: 1,
            communityLeaders: 4,
            basicServiceStaff: 6,
          }),
        },
      },
    });
    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function), {
      maxWait: 10_000,
      timeout: 30_000,
    });
    expect(logAuditMock).toHaveBeenNthCalledWith(1, expect.anything(), {
      authorId: 7,
      action: 'creation',
      entity: 'project',
      entityId: 42,
    });
    expect(logAuditMock).toHaveBeenNthCalledWith(2, expect.anything(), {
      authorId: 7,
      action: 'creation',
      entity: 'beneficiary',
      entityId: 9,
      details: {
        year: 2024,
        values: {
          directChildrenAdolescents: 10,
          indirectChildrenAdolescents: 5,
          youth18To29: 3,
          families: 2,
          coordinatedInstitutions: 1,
          communityLeaders: 4,
          basicServiceStaff: 6,
        },
      },
    });
  });

  test('allows a coordinator to create a project', async () => {
    authMock.mockResolvedValue({ user: { id: '3' } });
    findUserMock.mockResolvedValue({
      id: 3,
      role: 'coordinator',
      status: 'active',
      deletedAt: null,
    });
    const { projectCreate } = setupTransaction();

    await expect(createProject(EMPTY_STATE, buildFormData())).rejects.toThrow(
      'NEXT_REDIRECT:/dashboard/projects/42'
    );

    expect(projectCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ createdBy: 3 }),
    });
    expect(logAuditMock).toHaveBeenCalledWith(expect.anything(), {
      authorId: 3,
      action: 'creation',
      entity: 'project',
      entityId: 42,
    });
  });

  test('defaults beneficiary counts to 0 and year to the current year when omitted', async () => {
    const { beneficiaryCreate } = setupTransaction();

    await expect(
      createProject(
        EMPTY_STATE,
        buildFormData({
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
    ).rejects.toThrow('NEXT_REDIRECT:/dashboard/projects/42');

    expect(beneficiaryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        year: new Date().getFullYear(),
        values: {
          create: toBeneficiaryValuesCreate({
            directChildrenAdolescents: 0,
            indirectChildrenAdolescents: 0,
            youth18To29: 0,
            families: 0,
            coordinatedInstitutions: 0,
            communityLeaders: 0,
            basicServiceStaff: 0,
          }),
        },
      }),
    });
  });

  test('reports a message when the coordinator or department foreign key is invalid', async () => {
    transactionMock.mockRejectedValue(
      knownRequestError('P2003', { field_name: 'Project_leadCoordinatorId_fkey (index)' })
    );

    const result = await createProject(EMPTY_STATE, buildFormData());

    expect(result).toEqual({
      formError: 'El coordinador o el departamento seleccionado no existe.',
    });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  test('reports an invalid session message for other foreign key violations', async () => {
    transactionMock.mockRejectedValue(
      knownRequestError('P2003', { field_name: 'Project_createdBy_fkey (index)' })
    );

    const result = await createProject(EMPTY_STATE, buildFormData());

    expect(result).toEqual({ formError: 'Tu sesión ya no es válida. Iniciá sesión de nuevo.' });
  });

  test('falls back to meta.constraint when field_name is absent', async () => {
    transactionMock.mockRejectedValue(
      knownRequestError('P2003', { constraint: 'Project_leadCoordinatorId_fkey' })
    );

    const result = await createProject(EMPTY_STATE, buildFormData());

    expect(result).toEqual({
      formError: 'El coordinador o el departamento seleccionado no existe.',
    });
  });

  test('reports a generic error message and logs unexpected failures', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const unexpectedError = new Error('connection lost');
    transactionMock.mockRejectedValue(unexpectedError);

    const result = await createProject(EMPTY_STATE, buildFormData());

    expect(result).toEqual({ formError: 'No se pudo crear el proyecto. Intentá de nuevo.' });
    expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to create project', unexpectedError);
    expect(redirectMock).not.toHaveBeenCalled();
  });

  const TEXT_LIMITS = [
    { field: 'name', limit: 100 },
    { field: 'localityNeighborhood', limit: 100 },
    { field: 'generalObjective', limit: 500 },
    { field: 'publicDescription', limit: 1000 },
    { field: 'internalNotes', limit: 1000 },
  ];

  test.each(TEXT_LIMITS)(
    'accepts $field with exactly $limit characters',
    async ({ field, limit }) => {
      const { projectCreate } = setupTransaction();
      const value = 'a'.repeat(limit);
      await expect(createProject(EMPTY_STATE, buildFormData({ [field]: value }))).rejects.toThrow(
        'NEXT_REDIRECT:/dashboard/projects/42'
      );

      expect(projectCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ [field]: value }),
      });
    }
  );

  test.each(TEXT_LIMITS)(
    'rejects $field above $limit characters without accessing the database',
    async ({ field, limit }) => {
      const result = await createProject(
        EMPTY_STATE,
        buildFormData({ [field]: 'a'.repeat(limit + 1) })
      );

      expect(result.errors?.[field]).toEqual([`Máx. ${limit} caracteres`]);
      expect(transactionMock).not.toHaveBeenCalled();
    }
  );

  const BENEFICIARY_FIELDS = [
    'directChildrenAdolescents',
    'indirectChildrenAdolescents',
    'youth18To29',
    'families',
    'coordinatedInstitutions',
    'communityLeaders',
    'basicServiceStaff',
  ];

  test.each(BENEFICIARY_FIELDS)('accepts the int32 maximum for %s', async (field) => {
    const { beneficiaryCreate } = setupTransaction();

    await expect(
      createProject(EMPTY_STATE, buildFormData({ [field]: '2147483647' }))
    ).rejects.toThrow('NEXT_REDIRECT:/dashboard/projects/42');

    expect(beneficiaryCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        values: {
          create: expect.arrayContaining([
            { value: 2_147_483_647, category: { connect: { key: field } } },
          ]),
        },
      }),
    });
  });

  test.each(BENEFICIARY_FIELDS)(
    'rejects %s above the int32 maximum without accessing the database',
    async (field) => {
      const result = await createProject(EMPTY_STATE, buildFormData({ [field]: '2147483648' }));

      expect(result.errors?.[field]).toEqual(['La cantidad es demasiado grande']);
      expect(transactionMock).not.toHaveBeenCalled();
    }
  );
});
