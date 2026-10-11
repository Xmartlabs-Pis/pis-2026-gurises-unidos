import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import { createProject, updateProject } from '@/app/actions/projects';
import prisma from '@/lib/prisma';
import { toBeneficiaryValuesCreate } from '@/lib/project-display';
import { loadSeedData, type SeedData } from '../fixtures';
import { signInAs } from '../session';
import { auditLogsFor, deleteProject, loadProject } from './project-helpers';

const BENEFICIARY_YEAR = 2024;

let seed: SeedData;
let createdProjectIds: number[] = [];

function buildFormData(overrides: Record<string, string | string[]> = {}): FormData {
  const fields: Record<string, string | string[]> = {
    name: 'Project under edit',
    status: 'active',
    intensity: 'high',
    counterpartyType: 'publicSector',
    startYear: '2020',
    leadCoordinatorId: String(seed.coordinatorId),
    departmentId: String(seed.departmentIds[0]),
    zone: 'rural',
    localityNeighborhood: 'Barrio Sur',
    generalObjective: 'Objective',
    publicDescription: '',
    internalNotes: '',
    topicId: String(seed.topicIds[0]),
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

async function createProjectFixture(leadCoordinatorId = seed.coordinatorId) {
  const project = await prisma.project.create({
    data: {
      name: 'Project under edit',
      status: 'active',
      intensity: 'high',
      counterpartyType: 'publicSector',
      startYear: 2020,
      leadCoordinatorId,
      departmentId: seed.departmentIds[0],
      zone: 'rural',
      localityNeighborhood: 'Barrio Sur',
      generalObjective: 'Objective',
      createdBy: seed.adminId,
      topicId: seed.topicIds[0],
      projectBeneficiaries: {
        create: {
          year: BENEFICIARY_YEAR,
          authorId: seed.adminId,
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
      },
    },
  });
  createdProjectIds.push(project.id);
  return project.id;
}

async function expectRedirectToProject(result: Promise<unknown>, id: number) {
  await expect(result).rejects.toThrow(new RegExp(`^NEXT_REDIRECT:/dashboard/projects/${id}$`));
}

beforeAll(async () => {
  seed = await loadSeedData();
});

afterEach(async () => {
  const ids = createdProjectIds;
  createdProjectIds = [];
  for (const id of ids) await deleteProject(id);
});

describe('updateProject (integration)', () => {
  test.each(['admin', 'coordinator'] as const)(
    'persists counterparty changes and audits only the changed field as %s',
    async (role) => {
      const projectId = await createProjectFixture();
      signInAs(role === 'admin' ? seed.adminId : seed.coordinatorId);
      for (const counterpartyType of [
        'privateSector',
        'internationalCooperation',
        'publicSector',
      ] as const) {
        await expectRedirectToProject(
          updateProject(projectId, {}, buildFormData({ counterpartyType })),
          projectId
        );
        expect((await loadProject(projectId)).counterpartyType).toBe(counterpartyType);
      }
      expect(await auditLogsFor(projectId)).toEqual(
        Array.from({ length: 3 }, () =>
          expect.objectContaining({
            entity: 'project',
            action: 'update',
            details: { changedFields: ['counterpartyType'] },
          })
        )
      );
    }
  );

  test.each(['', 'invalid'])(
    'rejects counterparty %s without changing stored data',
    async (counterpartyType) => {
      const projectId = await createProjectFixture();
      signInAs(seed.adminId);
      const before = await loadProject(projectId);
      const result = await updateProject(projectId, {}, buildFormData({ counterpartyType }));
      expect(result.errors?.counterpartyType).toEqual(['Seleccioná una contraparte válida']);
      expect(await loadProject(projectId)).toEqual(before);
      expect(await auditLogsFor(projectId)).toEqual([]);
    }
  );

  test('rejects closing before stored beneficiary years without changing any data', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);

    const result = await updateProject(
      projectId,
      {},
      buildFormData({ status: 'closed', endYear: '2022', year: '2022', families: '99' })
    );

    expect(result.errors?.endYear).toEqual([
      'El año de cierre no puede ser anterior a 2024, que tiene beneficiarios registrados',
    ]);
    expect(await loadProject(projectId)).toEqual(before);
    expect(await auditLogsFor(projectId)).toEqual([]);
  });

  test('allows closing in the last stored beneficiary year and preserves its records', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);

    await expectRedirectToProject(
      updateProject(
        projectId,
        {},
        buildFormData({ status: 'closed', endYear: String(BENEFICIARY_YEAR) })
      ),
      projectId
    );

    const after = await loadProject(projectId);
    expect(after).toMatchObject({ status: 'closed', endYear: BENEFICIARY_YEAR });
    expect(after.projectBeneficiaries).toEqual(before.projectBeneficiaries);
    expect(await auditLogsFor(projectId)).toEqual([
      expect.objectContaining({ entity: 'project', action: 'update' }),
    ]);
  });

  test('persists changed fields and topic and audits only what changed', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const newTopicId = seed.topicIds[1];

    await expectRedirectToProject(
      updateProject(
        projectId,
        {},
        buildFormData({
          name: 'Renamed project',
          zone: 'city',
          departmentId: String(seed.departmentIds[1]),
          topicId: String(newTopicId),
        })
      ),
      projectId
    );

    const project = await loadProject(projectId);
    expect(project).toMatchObject({
      name: 'Renamed project',
      zone: 'city',
      departmentId: seed.departmentIds[1],
      status: 'active',
      startYear: 2020,
    });
    expect(project.topicId).toBe(newTopicId);
    expect(await auditLogsFor(projectId)).toEqual([
      expect.objectContaining({
        entity: 'project',
        action: 'update',
        authorId: seed.adminId,
        details: { changedFields: ['name', 'departmentId', 'zone', 'topicId'] },
      }),
    ]);
  });

  test('writes nothing when the submitted form matches the stored project', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);

    await expectRedirectToProject(updateProject(projectId, {}, buildFormData()), projectId);

    expect(await loadProject(projectId)).toEqual(before);
    expect(await auditLogsFor(projectId)).toEqual([]);
  });

  test('updates the beneficiaries of an existing year in place', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);

    await expectRedirectToProject(
      updateProject(projectId, {}, buildFormData({ families: '7', youth18To29: '9' })),
      projectId
    );

    const { projectBeneficiaries } = await loadProject(projectId);
    expect(projectBeneficiaries).toEqual([
      expect.objectContaining({ year: BENEFICIARY_YEAR, families: 7, youth18To29: 9 }),
    ]);
    expect(await auditLogsFor(projectId)).toEqual([
      expect.objectContaining({
        entity: 'beneficiary',
        action: 'update',
        entityId: projectBeneficiaries[0].id,
        details: {
          year: BENEFICIARY_YEAR,
          changes: [
            { field: 'youth18To29', from: 3, to: 9 },
            { field: 'families', from: 2, to: 7 },
          ],
        },
      }),
    ]);
  });

  test('keeps values of inactive categories when updating beneficiaries', async () => {
    const projectId = await createProjectFixture();
    const category = await prisma.beneficiaryCategory.create({
      data: {
        key: `customCategory${projectId}`,
        name: `Custom category ${projectId}`,
        isActive: false,
      },
    });
    const [beneficiary] = (await loadProject(projectId)).projectBeneficiaries;
    await prisma.projectBeneficiaryValue.create({
      data: { beneficiaryId: beneficiary.id, categoryId: category.id, value: 11 },
    });
    signInAs(seed.adminId);

    try {
      await expectRedirectToProject(
        updateProject(projectId, {}, buildFormData({ families: '7' })),
        projectId
      );

      expect(
        await prisma.projectBeneficiaryValue.findUnique({
          where: {
            beneficiaryId_categoryId: { beneficiaryId: beneficiary.id, categoryId: category.id },
          },
          select: { value: true },
        })
      ).toEqual({ value: 11 });
      expect((await loadProject(projectId)).projectBeneficiaries).toEqual([
        expect.objectContaining({ families: 7, youth18To29: 3 }),
      ]);
    } finally {
      await prisma.projectBeneficiaryValue.deleteMany({ where: { categoryId: category.id } });
      await prisma.beneficiaryCategory.delete({ where: { id: category.id } });
    }
  });

  test('adds a beneficiary row for a new year and keeps the previous one', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);

    await expectRedirectToProject(
      updateProject(projectId, {}, buildFormData({ year: '2025', families: '20' })),
      projectId
    );

    const { projectBeneficiaries } = await loadProject(projectId);
    expect(projectBeneficiaries).toEqual([
      expect.objectContaining({ year: BENEFICIARY_YEAR, families: 2 }),
      expect.objectContaining({ year: 2025, families: 20, authorId: seed.adminId }),
    ]);
    expect(await auditLogsFor(projectId)).toEqual([
      expect.objectContaining({
        entity: 'beneficiary',
        action: 'creation',
        entityId: projectBeneficiaries[1].id,
      }),
    ]);
  });

  test('lets the lead coordinator edit their own project', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.coordinatorId);

    await expectRedirectToProject(
      updateProject(projectId, {}, buildFormData({ name: 'Edited by coordinator' })),
      projectId
    );

    expect((await loadProject(projectId)).name).toBe('Edited by coordinator');
    expect(await auditLogsFor(projectId)).toEqual([
      expect.objectContaining({ entity: 'project', authorId: seed.coordinatorId }),
    ]);
  });

  test('rejects a coordinator who does not lead the project', async () => {
    const projectId = await createProjectFixture(seed.disabledCoordinatorId);
    signInAs(seed.coordinatorId);
    const before = await loadProject(projectId);

    const result = await updateProject(
      projectId,
      {},
      buildFormData({
        name: 'Hijacked',
        leadCoordinatorId: String(seed.disabledCoordinatorId),
      })
    );

    expect(result.formError).toBe('No tenés permiso para editar este proyecto.');
    expect(await loadProject(projectId)).toEqual(before);
    expect(await auditLogsFor(projectId)).toEqual([]);
  });

  test('keeps a lead coordinator who was disabled after being assigned', async () => {
    const projectId = await createProjectFixture(seed.disabledCoordinatorId);
    signInAs(seed.adminId);

    await expectRedirectToProject(
      updateProject(
        projectId,
        {},
        buildFormData({
          name: 'Still led by disabled',
          leadCoordinatorId: String(seed.disabledCoordinatorId),
        })
      ),
      projectId
    );

    expect(await loadProject(projectId)).toMatchObject({
      name: 'Still led by disabled',
      leadCoordinatorId: seed.disabledCoordinatorId,
    });
  });

  test('rejects switching to a disabled lead coordinator', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);

    const result = await updateProject(
      projectId,
      {},
      buildFormData({ leadCoordinatorId: String(seed.disabledCoordinatorId) })
    );

    expect(result.errors?.leadCoordinatorId).toEqual(['Elegí un coordinador válido']);
    expect(await loadProject(projectId)).toEqual(before);
  });

  test('rejects an unknown topic without touching the project', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);
    const unknownTopicId = Math.max(0, ...seed.topicIds) + 1000;

    const result = await updateProject(
      projectId,
      {},
      buildFormData({ name: 'Should not persist', topicId: String(unknownTopicId) })
    );

    expect(result.errors?.topicId).toEqual(['Elegí una temática válida']);
    expect(await loadProject(projectId)).toEqual(before);
  });

  test('rolls back every change when the department does not exist', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);

    const result = await updateProject(
      projectId,
      {},
      buildFormData({ name: 'Should not persist', departmentId: '999999', families: '99' })
    );

    expect(result.formError).toBe('El coordinador o el departamento seleccionado no existe.');
    expect(await loadProject(projectId)).toEqual(before);
    expect(await auditLogsFor(projectId)).toEqual([]);
  });

  test('reports a project that does not exist', async () => {
    signInAs(seed.adminId);

    const result = await updateProject(999_999, {}, buildFormData());

    expect(result.formError).toBe('El proyecto no existe o fue eliminado.');
  });

  test('rejects an invalid project id', async () => {
    signInAs(seed.adminId);

    const result = await updateProject(0, {}, buildFormData());

    expect(result.formError).toBe('El proyecto no es válido.');
  });

  test('redirects to login when the session user is not active', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.disabledCoordinatorId);
    const before = await loadProject(projectId);

    await expect(
      updateProject(projectId, {}, buildFormData({ name: 'Should not persist' }))
    ).rejects.toThrow(/^NEXT_REDIRECT:\/login$/);
    expect(await loadProject(projectId)).toEqual(before);
  });
});

describe('createProject counterparty (integration)', () => {
  test.each(['publicSector', 'privateSector', 'internationalCooperation'])(
    'persists counterparty %s when creating a project',
    async (counterpartyType) => {
      signInAs(seed.adminId);
      const name = `Counterparty ${counterpartyType}`;
      await expect(createProject({}, buildFormData({ name, counterpartyType }))).rejects.toThrow(
        /^NEXT_REDIRECT:\/dashboard\/projects\/\d+$/
      );
      const project = await prisma.project.findFirstOrThrow({ where: { name } });
      createdProjectIds.push(project.id);
      expect((await loadProject(project.id)).counterpartyType).toBe(counterpartyType);
    }
  );
});
