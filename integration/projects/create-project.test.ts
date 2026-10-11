import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { createProject } from '@/app/actions/projects';
import { logAudit } from '@/lib/audit-log';
import prisma from '@/lib/prisma';
import { PROJECT_PLACEHOLDERS } from '@/lib/projects/project-placeholders';
import { loadSeedData, type SeedData } from '../fixtures';
import { signInAs } from '../session';
import { auditLogsFor, deleteProject, loadProject } from './project-helpers';

const BENEFICIARY_YEAR = 2024;

vi.mock('@/lib/audit-log', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit-log')>();
  return { logAudit: vi.fn(actual.logAudit) };
});

let seed: SeedData;
let createdProjectIds: number[] = [];

function buildFormData(overrides: Record<string, string | string[]> = {}): FormData {
  const fields: Record<string, string | string[]> = {
    name: 'Project under creation',
    status: 'active',
    intensity: 'high',
    counterpartyType: 'publicSector',
    startYear: '2020',
    endYear: '',
    leadCoordinatorId: String(seed.coordinatorId),
    departmentId: String(seed.departmentIds[0]),
    zone: 'rural',
    localityNeighborhood: 'Barrio Sur',
    generalObjective: 'Objective',
    publicDescription: 'Public description',
    internalNotes: '',
    topicId: String(seed.topicIds[0]),
    projectPlaceholder: PROJECT_PLACEHOLDERS[2],
    year: String(BENEFICIARY_YEAR),
    directChildrenAdolescents: '10',
    indirectChildrenAdolescents: '5',
    youth18To29: '3',
    families: '2',
    coordinatedInstitutions: '1',
    communityLeaders: '4',
    basicServiceStaff: '6',
    ...overrides,
  };
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    for (const item of [value].flat()) formData.append(key, item);
  }
  return formData;
}

async function createProjectFixture(name: string, startYear = 2020) {
  const project = await prisma.project.create({
    data: {
      name,
      status: 'active',
      intensity: 'high',
      counterpartyType: 'publicSector',
      startYear,
      leadCoordinatorId: seed.coordinatorId,
      departmentId: seed.departmentIds[0],
      zone: 'rural',
      createdBy: seed.adminId,
      topicId: seed.topicIds[0],
    },
  });
  createdProjectIds.push(project.id);
  return project.id;
}

async function expectRedirectToNewProject(result: Promise<unknown>) {
  const error = await result.then(
    (state) => {
      throw new Error(`Expected a redirect, got ${JSON.stringify(state)}`);
    },
    (rejection: Error) => rejection
  );
  const match = /^NEXT_REDIRECT:\/dashboard\/projects\/(\d+)$/.exec(error.message);
  expect(match, error.message).not.toBeNull();
  const projectId = Number(match![1]);
  createdProjectIds.push(projectId);
  return projectId;
}

function countRows() {
  return Promise.all([
    prisma.project.count(),
    prisma.projectBeneficiary.count(),
    prisma.auditLog.count(),
  ]);
}

beforeAll(async () => {
  seed = await loadSeedData();
});

afterEach(async () => {
  vi.restoreAllMocks();
  const ids = createdProjectIds;
  createdProjectIds = [];
  for (const id of ids) await deleteProject(id);
});

describe('createProject (integration)', () => {
  test('persists the project with its first beneficiaries and audits both', async () => {
    signInAs(seed.adminId);

    const projectId = await expectRedirectToNewProject(createProject({}, buildFormData()));

    const project = await loadProject(projectId);
    expect(project).toMatchObject({
      name: 'Project under creation',
      status: 'active',
      intensity: 'high',
      counterpartyType: 'publicSector',
      startYear: 2020,
      endYear: null,
      leadCoordinatorId: seed.coordinatorId,
      departmentId: seed.departmentIds[0],
      topicId: seed.topicIds[0],
      zone: 'rural',
      localityNeighborhood: 'Barrio Sur',
      generalObjective: 'Objective',
      publicDescription: 'Public description',
      internalNotes: null,
      coverPhoto: PROJECT_PLACEHOLDERS[2],
      createdBy: seed.adminId,
      deletedAt: null,
    });
    expect(project.projectBeneficiaries).toEqual([
      expect.objectContaining({
        year: BENEFICIARY_YEAR,
        directChildrenAdolescents: 10,
        indirectChildrenAdolescents: 5,
        youth18To29: 3,
        families: 2,
        coordinatedInstitutions: 1,
        communityLeaders: 4,
        basicServiceStaff: 6,
        authorId: seed.adminId,
      }),
    ]);
    expect(await auditLogsFor(projectId)).toEqual([
      expect.objectContaining({
        entity: 'project',
        action: 'creation',
        entityId: projectId,
        authorId: seed.adminId,
      }),
      expect.objectContaining({
        entity: 'beneficiary',
        action: 'creation',
        entityId: project.projectBeneficiaries[0].id,
        authorId: seed.adminId,
        details: {
          year: BENEFICIARY_YEAR,
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
      }),
    ]);
  });

  test('stores a closed project with its end year', async () => {
    signInAs(seed.adminId);

    const projectId = await expectRedirectToNewProject(
      createProject(
        {},
        buildFormData({
          name: 'Closed on creation',
          status: 'closed',
          endYear: '2023',
          year: '2022',
        })
      )
    );

    expect(await loadProject(projectId)).toMatchObject({
      status: 'closed',
      endYear: 2023,
      projectBeneficiaries: [expect.objectContaining({ year: 2022 })],
    });
  });

  test('defaults empty beneficiary counts to zero', async () => {
    signInAs(seed.adminId);

    const projectId = await expectRedirectToNewProject(
      createProject(
        {},
        buildFormData({ name: 'Without beneficiaries', families: '', basicServiceStaff: '' })
      )
    );

    const { projectBeneficiaries } = await loadProject(projectId);
    expect(projectBeneficiaries).toEqual([
      expect.objectContaining({ families: 0, basicServiceStaff: 0 }),
    ]);
  });

  test('assigns a valid placeholder when the submitted one is not allowed', async () => {
    signInAs(seed.adminId);

    const projectId = await expectRedirectToNewProject(
      createProject(
        {},
        buildFormData({ name: 'Unknown placeholder', projectPlaceholder: '/etc/passwd' })
      )
    );

    const { coverPhoto } = await loadProject(projectId);
    expect(PROJECT_PLACEHOLDERS).toContain(coverPhoto);
  });

  test('lets a coordinator create a project and records them as author', async () => {
    signInAs(seed.coordinatorId);

    const projectId = await expectRedirectToNewProject(
      createProject({}, buildFormData({ name: 'Created by coordinator' }))
    );

    expect(await loadProject(projectId)).toMatchObject({ createdBy: seed.coordinatorId });
    expect(await auditLogsFor(projectId)).toEqual([
      expect.objectContaining({ entity: 'project', authorId: seed.coordinatorId }),
      expect.objectContaining({ entity: 'beneficiary', authorId: seed.coordinatorId }),
    ]);
  });

  test('allows reusing a name with a different start year', async () => {
    await createProjectFixture('Recurring project', 2019);
    signInAs(seed.adminId);

    const projectId = await expectRedirectToNewProject(
      createProject({}, buildFormData({ name: 'Recurring project', startYear: '2020' }))
    );

    expect(await loadProject(projectId)).toMatchObject({
      name: 'Recurring project',
      startYear: 2020,
    });
  });

  test('rejects a duplicated name and start year regardless of case', async () => {
    await createProjectFixture('Duplicated project');
    signInAs(seed.adminId);
    const before = await countRows();

    const result = await createProject({}, buildFormData({ name: 'DUPLICATED PROJECT' }));

    expect(result.errors?.name).toEqual(['Ya existe un proyecto con ese nombre y año de inicio']);
    expect(await countRows()).toEqual(before);
  });

  test('rejects a disabled lead coordinator', async () => {
    signInAs(seed.adminId);
    const before = await countRows();

    const result = await createProject(
      {},
      buildFormData({ leadCoordinatorId: String(seed.disabledCoordinatorId) })
    );

    expect(result.errors?.leadCoordinatorId).toEqual(['Elegí un coordinador válido']);
    expect(await countRows()).toEqual(before);
  });

  test('rejects an admin as lead coordinator', async () => {
    signInAs(seed.adminId);
    const before = await countRows();

    const result = await createProject(
      {},
      buildFormData({ leadCoordinatorId: String(seed.adminId) })
    );

    expect(result.errors?.leadCoordinatorId).toEqual(['Elegí un coordinador válido']);
    expect(await countRows()).toEqual(before);
  });

  test('rejects an unknown topic', async () => {
    signInAs(seed.adminId);
    const before = await countRows();
    const unknownTopicId = Math.max(0, ...seed.topicIds) + 1000;

    const result = await createProject({}, buildFormData({ topicId: String(unknownTopicId) }));

    expect(result.errors?.topicId).toEqual(['Elegí una temática válida']);
    expect(await countRows()).toEqual(before);
  });

  test('rejects more than one topic', async () => {
    signInAs(seed.adminId);
    const before = await countRows();

    const result = await createProject(
      {},
      buildFormData({ topicId: [String(seed.topicIds[0]), String(seed.topicIds[1])] })
    );

    expect(result.errors?.topicId).toEqual(['Elegí una temática válida']);
    expect(await countRows()).toEqual(before);
  });

  test('rejects beneficiaries after the end year of a closed project', async () => {
    signInAs(seed.adminId);
    const before = await countRows();

    const result = await createProject(
      {},
      buildFormData({ status: 'closed', endYear: '2023', year: '2024' })
    );

    expect(result.errors?.year).toEqual([
      'El año de beneficiarios no puede ser posterior al año de cierre',
    ]);
    expect(await countRows()).toEqual(before);
  });

  test('returns a form error when the department does not exist', async () => {
    signInAs(seed.adminId);
    const before = await countRows();

    const result = await createProject({}, buildFormData({ departmentId: '999999' }));

    expect(result.formError).toBe('El coordinador o el departamento seleccionado no existe.');
    expect(await countRows()).toEqual(before);
  });

  test('rolls back the project when a later step of the creation fails', async () => {
    signInAs(seed.adminId);
    const before = await countRows();
    const realLogAudit = vi.mocked(logAudit).getMockImplementation()!;
    vi.mocked(logAudit)
      .mockClear()
      .mockImplementationOnce(realLogAudit)
      .mockRejectedValueOnce(new Error('Audit failure'));
    vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await createProject({}, buildFormData({ name: 'Rolled back project' }));

    expect(result.formError).toBe('No se pudo crear el proyecto. Intentá de nuevo.');
    expect(vi.mocked(logAudit)).toHaveBeenCalledTimes(2);
    expect(await countRows()).toEqual(before);
  });

  test('returns validation errors without touching the database', async () => {
    signInAs(seed.adminId);
    const before = await countRows();

    const result = await createProject(
      {},
      buildFormData({ name: '', status: 'closed', endYear: '', year: '2019' })
    );

    expect(result.errors).toMatchObject({
      name: ['El nombre es obligatorio'],
      endYear: ['El año de fin es obligatorio para proyectos cerrados'],
    });
    expect(await countRows()).toEqual(before);
  });

  test('redirects to login when nobody is signed in', async () => {
    const before = await countRows();

    await expect(createProject({}, buildFormData())).rejects.toThrow(/^NEXT_REDIRECT:\/login$/);
    expect(await countRows()).toEqual(before);
  });

  test('redirects to login when the session user is not active', async () => {
    signInAs(seed.disabledCoordinatorId);
    const before = await countRows();

    await expect(createProject({}, buildFormData())).rejects.toThrow(/^NEXT_REDIRECT:\/login$/);
    expect(await countRows()).toEqual(before);
  });
});
