import { afterEach, beforeAll, describe, expect, test, vi } from 'vitest';
import { deletePartner } from '@/app/actions/partners';
import { createProject, updateProject } from '@/app/actions/projects';
import { logAudit } from '@/lib/audit-log';
import prisma from '@/lib/prisma';
import { toBeneficiaryValuesCreate } from '@/lib/project-display';
import { loadSeedData, type SeedData } from '../fixtures';
import { signInAs } from '../session';
import { auditLogsFor, deleteProject, loadProject } from './project-helpers';

const BENEFICIARY_YEAR = 2024;

vi.mock('@/lib/audit-log', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit-log')>();
  return { ...actual, logAudit: vi.fn(actual.logAudit) };
});

let seed: SeedData;
let createdProjectIds: number[] = [];

function location(departmentId: number, city = '', neighborhood = '') {
  return JSON.stringify({ departmentId: String(departmentId), city, neighborhood });
}

function buildFormData(overrides: Record<string, string | string[]> = {}): FormData {
  const fields: Record<string, string | string[]> = {
    name: 'Project under edit',
    status: 'active',
    intensity: 'high',
    counterpartyTypes: ['publicSector'],
    startYear: '2020',
    leadCoordinatorId: String(seed.coordinatorId),
    geographicScope: 'national',
    locations: [location(seed.departmentIds[0], 'Colonia del Sacramento', 'Barrio Sur')],
    generalObjective: 'Objective',
    publicDescription: '',
    internalNotes: '',
    topicIds: [String(seed.topicIds[0])],
    strategicLineIds: [String(seed.strategicLineIds[0])],
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
      counterpartyTypes: ['publicSector'],
      startYear: 2020,
      leadCoordinatorId,
      departments: { connect: { id: seed.departmentIds[0] } },
      zone: 'rural',
      localities: {
        create: {
          departmentId: seed.departmentIds[0],
          city: 'Colonia del Sacramento',
          neighborhood: 'Barrio Sur',
        },
      },
      generalObjective: 'Objective',
      createdBy: seed.adminId,
      topics: { connect: { id: seed.topicIds[0] } },
      strategicLines: { connect: { id: seed.strategicLineIds[0] } },
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
          updateProject(projectId, {}, buildFormData({ counterpartyTypes: [counterpartyType] })),
          projectId
        );
        expect((await loadProject(projectId)).counterpartyTypes).toEqual([counterpartyType]);
      }
      expect(await auditLogsFor(projectId)).toEqual(
        ['publicSector', 'privateSector', 'internationalCooperation'].map((from, index) =>
          expect.objectContaining({
            entity: 'project',
            action: 'update',
            details: {
              changedFields: ['counterpartyTypes'],
              changes: [
                {
                  field: 'counterpartyTypes',
                  from: [from],
                  to: [['privateSector', 'internationalCooperation', 'publicSector'][index]],
                },
              ],
            },
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
      const result = await updateProject(
        projectId,
        {},
        buildFormData({ counterpartyTypes: [counterpartyType] })
      );
      expect(result.errors?.counterpartyTypes).toEqual(['Seleccioná una contraparte válida']);
      expect(await loadProject(projectId)).toEqual(before);
      expect(await auditLogsFor(projectId)).toEqual([]);
    }
  );

  test('rejects a project without counterparties without changing stored data', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);
    const result = await updateProject(projectId, {}, buildFormData({ counterpartyTypes: [] }));
    expect(result.errors?.counterpartyTypes).toEqual(['Seleccioná al menos una contraparte']);
    expect(await loadProject(projectId)).toEqual(before);
    expect(await auditLogsFor(projectId)).toEqual([]);
  });

  test('stores several counterparties and ignores the order they were selected in', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const counterpartyTypes = ['privateSector', 'publicSector'];
    await expectRedirectToProject(
      updateProject(projectId, {}, buildFormData({ counterpartyTypes })),
      projectId
    );
    expect((await loadProject(projectId)).counterpartyTypes).toEqual([
      'publicSector',
      'privateSector',
    ]);
    await expectRedirectToProject(
      updateProject(
        projectId,
        {},
        buildFormData({ counterpartyTypes: ['publicSector', 'privateSector'] })
      ),
      projectId
    );
    expect(await auditLogsFor(projectId)).toHaveLength(1);
  });

  test('persists and audits the beneficiaries edited in every year', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);

    await expectRedirectToProject(
      updateProject(
        projectId,
        {},
        buildFormData({
          year: '2023',
          families: '20',
          beneficiaryDrafts: [
            JSON.stringify({ year: '2024', families: '99' }),
            JSON.stringify({ year: '2022', families: '7' }),
          ],
        })
      ),
      projectId
    );

    const { projectBeneficiaries } = await loadProject(projectId);
    expect(projectBeneficiaries.map(({ year, families }) => [year, families])).toEqual([
      [2022, 7],
      [2023, 20],
      [2024, 99],
    ]);
    const audits = await auditLogsFor(projectId);
    expect(audits.filter(({ entity }) => entity === 'beneficiary')).toHaveLength(3);
  });

  test('clears intensity when drafts remove the last direct children', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);

    await expectRedirectToProject(
      updateProject(
        projectId,
        {},
        buildFormData({
          year: '2023',
          intensity: '',
          directChildrenAdolescents: '0',
          beneficiaryDrafts: [JSON.stringify({ year: '2024', families: '2' })],
        })
      ),
      projectId
    );

    expect((await loadProject(projectId)).intensity).toBeNull();
  });

  test('rejects drafts outside the project period without changing any data', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);

    const result = await updateProject(
      projectId,
      {},
      buildFormData({ beneficiaryDrafts: [JSON.stringify({ year: '2019', families: '7' })] })
    );

    expect(result.errors?.beneficiaryDrafts).toHaveLength(1);
    expect(await loadProject(projectId)).toEqual(before);
    expect(await auditLogsFor(projectId)).toEqual([]);
  });

  test('rejects moving the start after stored beneficiary years without changing any data', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);

    const result = await updateProject(
      projectId,
      {},
      buildFormData({ startYear: '2025', year: '2025', families: '99' })
    );

    expect(result.errors?.startYear).toEqual([
      'El año de inicio no puede ser posterior a 2024, porque tiene beneficiarios registrados',
    ]);
    expect(await loadProject(projectId)).toEqual(before);
    expect(await auditLogsFor(projectId)).toEqual([]);
  });

  test('allows moving the start past a saved year whose counts are all zero', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    await prisma.projectBeneficiaryValue.updateMany({
      where: { beneficiary: { projectId } },
      data: { value: 0 },
    });

    await expectRedirectToProject(
      updateProject(projectId, {}, buildFormData({ startYear: '2025', year: '2025' })),
      projectId
    );

    const after = await loadProject(projectId);
    expect(after.startYear).toBe(2025);
    expect(after.projectBeneficiaries.some(({ year }) => year === BENEFICIARY_YEAR)).toBe(true);
  });

  test('clears all counts and moves the start in the same transaction', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const categories = await prisma.beneficiaryCategory.findMany({ where: { isActive: true } });
    const emptyCounts = Object.fromEntries(categories.map(({ key }) => [key, '0']));

    await expectRedirectToProject(
      updateProject(
        projectId,
        {},
        buildFormData({
          startYear: '2025',
          year: '2025',
          beneficiaryDrafts: [JSON.stringify({ year: String(BENEFICIARY_YEAR), ...emptyCounts })],
        })
      ),
      projectId
    );

    expect((await loadProject(projectId)).startYear).toBe(2025);
    expect(
      await prisma.projectBeneficiaryValue.count({
        where: { beneficiary: { projectId, year: BENEFICIARY_YEAR }, value: { gt: 0 } },
      })
    ).toBe(0);
  });

  test('allows moving the start to the first stored beneficiary year', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);

    await expectRedirectToProject(
      updateProject(projectId, {}, buildFormData({ startYear: String(BENEFICIARY_YEAR) })),
      projectId
    );

    const after = await loadProject(projectId);
    expect(after.startYear).toBe(BENEFICIARY_YEAR);
    expect(after.projectBeneficiaries).toEqual(before.projectBeneficiaries);
  });

  test('rejects marking as inactive before stored beneficiary years without changing any data', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);

    const result = await updateProject(
      projectId,
      {},
      buildFormData({ status: 'inactive', endYear: '2022', year: '2022', families: '99' })
    );

    expect(result.errors?.endYear).toEqual([
      'El año de fin no puede ser anterior a 2024, que tiene beneficiarios registrados',
    ]);
    expect(await loadProject(projectId)).toEqual(before);
    expect(await auditLogsFor(projectId)).toEqual([]);
  });

  test('allows marking as inactive in the last stored beneficiary year and preserves its records', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);

    await expectRedirectToProject(
      updateProject(
        projectId,
        {},
        buildFormData({ status: 'inactive', endYear: String(BENEFICIARY_YEAR) })
      ),
      projectId
    );

    const after = await loadProject(projectId);
    expect(after).toMatchObject({ status: 'inactive', endYear: BENEFICIARY_YEAR });
    expect(after.projectBeneficiaries).toEqual(before.projectBeneficiaries);
    expect(await auditLogsFor(projectId)).toEqual([
      expect.objectContaining({ entity: 'project', action: 'update' }),
    ]);
  });

  test.each([false, true])(
    'allows closing before an empty later year (clear in submission: %s)',
    async (clearInSubmission) => {
      const projectId = await createProjectFixture();
      signInAs(seed.adminId);
      const categories = await prisma.beneficiaryCategory.findMany({ where: { isActive: true } });
      const emptyCounts = Object.fromEntries(categories.map(({ key }) => [key, '0']));
      if (!clearInSubmission) {
        await prisma.projectBeneficiaryValue.updateMany({
          where: { beneficiary: { projectId } },
          data: { value: 0 },
        });
      }
      await expectRedirectToProject(
        updateProject(
          projectId,
          {},
          buildFormData({
            status: 'inactive',
            endYear: '2022',
            year: '2022',
            beneficiaryDrafts: clearInSubmission
              ? [JSON.stringify({ year: String(BENEFICIARY_YEAR), ...emptyCounts })]
              : [],
          })
        ),
        projectId
      );
      expect(await loadProject(projectId)).toMatchObject({ status: 'inactive', endYear: 2022 });
      expect(
        await prisma.projectBeneficiaryValue.count({
          where: { beneficiary: { projectId, year: BENEFICIARY_YEAR }, value: { gt: 0 } },
        })
      ).toBe(0);
    }
  );

  test('persists changed fields and topics and audits only what changed', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const newTopicIds = [seed.topicIds[1], seed.topicIds[2]];

    await expectRedirectToProject(
      updateProject(
        projectId,
        {},
        buildFormData({
          name: 'Renamed project',
          locations: [location(seed.departmentIds[1], 'Colonia del Sacramento', 'Barrio Sur')],
          topicIds: newTopicIds.map(String),
        })
      ),
      projectId
    );

    const project = await loadProject(projectId);
    expect(project).toMatchObject({
      name: 'Renamed project',
      zone: 'rural',
      departments: [{ id: seed.departmentIds[1] }],
      localities: [
        {
          departmentId: seed.departmentIds[1],
          city: 'Colonia del Sacramento',
          neighborhood: 'Barrio Sur',
        },
      ],
      status: 'active',
      startYear: 2020,
    });
    expect(project.topics).toEqual([...newTopicIds].sort((a, b) => a - b).map((id) => ({ id })));
    expect(await auditLogsFor(projectId)).toEqual([
      expect.objectContaining({
        entity: 'project',
        action: 'update',
        authorId: seed.adminId,
        details: {
          changedFields: ['name', 'topics', 'departments', 'localities'],
          changes: [
            { field: 'name', from: 'Project under edit', to: 'Renamed project' },
            {
              field: 'topics',
              from: [{ id: seed.topicIds[0], name: expect.any(String) }],
              to: [...newTopicIds]
                .sort((a, b) => a - b)
                .map((id) => ({ id, name: expect.any(String) })),
            },
            {
              field: 'departments',
              from: [{ id: seed.departmentIds[0], name: expect.any(String) }],
              to: [{ id: seed.departmentIds[1], name: expect.any(String) }],
            },
            {
              field: 'localities',
              from: [{ name: expect.stringMatching(/, Colonia del Sacramento, Barrio Sur$/) }],
              to: [{ name: expect.stringMatching(/, Colonia del Sacramento, Barrio Sur$/) }],
            },
          ],
        },
      }),
    ]);
  });

  test('persists and audits the region when the project becomes international', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);

    await expectRedirectToProject(
      updateProject(
        projectId,
        {},
        buildFormData({
          geographicScope: 'international',
          countries: ['Canadá'],
          region: 'northAmerica',
          locations: [],
        })
      ),
      projectId
    );

    expect(await loadProject(projectId)).toMatchObject({
      geographicScope: 'international',
      countries: ['Canadá'],
      region: 'northAmerica',
    });
    const [log] = await auditLogsFor(projectId);
    expect(log.details).toMatchObject({
      changedFields: expect.arrayContaining(['geographicScope', 'countries', 'region']),
      changes: expect.arrayContaining([{ field: 'region', from: null, to: 'northAmerica' }]),
    });
  });

  test('clears the region when an international project becomes national', async () => {
    const projectId = await createProjectFixture();
    await prisma.project.update({
      where: { id: projectId },
      data: {
        geographicScope: 'international',
        countries: ['Chile'],
        region: 'southAmerica',
        departments: { set: [] },
        localities: { deleteMany: {} },
      },
    });
    signInAs(seed.adminId);

    await expectRedirectToProject(
      updateProject(projectId, {}, buildFormData({ region: 'southAmerica' })),
      projectId
    );

    expect(await loadProject(projectId)).toMatchObject({
      geographicScope: 'national',
      countries: [],
      region: null,
    });
  });

  test('writes nothing when the submitted form matches the stored project', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);

    await expectRedirectToProject(updateProject(projectId, {}, buildFormData()), projectId);

    expect(await loadProject(projectId)).toEqual(before);
    expect(await auditLogsFor(projectId)).toEqual([]);
  });

  test('ignores a submitted zone and keeps the stored one', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);

    await expectRedirectToProject(
      updateProject(projectId, {}, buildFormData({ zone: 'city' })),
      projectId
    );

    expect(await loadProject(projectId)).toEqual(before);
    expect(before.zone).toBe('rural');
    expect(await auditLogsFor(projectId)).toEqual([]);
  });

  test('writes nothing when the edit form lists the same localities in another order', async () => {
    const projectId = await createProjectFixture();
    const [first, second] = (
      await prisma.department.findMany({
        where: { id: { in: seed.departmentIds } },
        orderBy: { name: 'asc' },
        select: { id: true },
      })
    ).map(({ id }) => id);
    await prisma.project.update({
      where: { id: projectId },
      data: {
        departments: { set: [{ id: second }, { id: first }] },
        localities: {
          deleteMany: {},
          create: [
            { departmentId: second, city: 'Paysandú', neighborhood: null },
            { departmentId: first, city: 'Colonia del Sacramento', neighborhood: 'Barrio Sur' },
          ],
        },
      },
    });
    signInAs(seed.adminId);
    const before = await loadProject(projectId);

    await expectRedirectToProject(
      updateProject(
        projectId,
        {},
        buildFormData({
          locations: [
            location(first, 'Colonia del Sacramento', 'Barrio Sur'),
            location(second, 'Paysandú'),
          ],
        })
      ),
      projectId
    );

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

  test('rolls back project, topics, beneficiaries and audit together, then persists a retry', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const formData = buildFormData({
      name: 'Rolled back project',
      topicIds: [String(seed.topicIds[1])],
      year: '2025',
      families: '35',
      coverPhoto: '/forged-cover.png',
    });
    const before = await loadProject(projectId);
    const auditCountBefore = await prisma.auditLog.count({ where: { authorId: seed.adminId } });
    const realLogAudit = vi.mocked(logAudit).getMockImplementation()!;
    vi.mocked(logAudit).mockImplementation((...args) => {
      if (args[1].entity === 'beneficiary') throw new Error('Audit failure');
      return realLogAudit(...args);
    });
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      vi.mocked(logAudit).mockClear();
      expect(await updateProject(projectId, {}, formData)).toEqual({
        formError: 'No se pudo actualizar el proyecto. Intentá de nuevo.',
      });
      expect(vi.mocked(logAudit).mock.calls.map(([, entry]) => entry.entity)).toEqual([
        'project',
        'beneficiary',
      ]);
    } finally {
      errorSpy.mockRestore();
      vi.mocked(logAudit).mockImplementation(realLogAudit);
    }

    expect(await loadProject(projectId)).toEqual(before);
    expect(await prisma.auditLog.count({ where: { authorId: seed.adminId } })).toBe(
      auditCountBefore
    );

    await expectRedirectToProject(updateProject(projectId, {}, formData), projectId);

    const saved = await loadProject(projectId);
    expect(saved).toMatchObject({
      name: 'Rolled back project',
      topics: [{ id: seed.topicIds[1] }],
      coverPhoto: before.coverPhoto,
    });
    expect(saved.projectBeneficiaries).toEqual([
      before.projectBeneficiaries[0],
      expect.objectContaining({ year: 2025, families: 35 }),
    ]);
    expect(await auditLogsFor(projectId)).toEqual([
      expect.objectContaining({ entity: 'project', action: 'update' }),
      expect.objectContaining({ entity: 'beneficiary', action: 'creation' }),
    ]);

    await expectRedirectToProject(updateProject(projectId, {}, formData), projectId);

    expect((await loadProject(projectId)).updatedAt).toEqual(saved.updatedAt);
    expect(await auditLogsFor(projectId)).toHaveLength(2);
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
      buildFormData({ name: 'Should not persist', topicIds: [String(unknownTopicId)] })
    );

    expect(result.errors?.topicIds).toEqual(['Elegí temáticas válidas']);
    expect(await loadProject(projectId)).toEqual(before);
  });

  test('rolls back every change when the department does not exist', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);

    const result = await updateProject(
      projectId,
      {},
      buildFormData({
        name: 'Should not persist',
        locations: [location(999999, 'Colonia del Sacramento')],
        families: '99',
      })
    );

    expect(result.errors?.locations).toEqual(['Elegí departamentos válidos']);
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

  test('allows assigning an admin as lead coordinator', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);

    await expectRedirectToProject(
      updateProject(projectId, {}, buildFormData({ leadCoordinatorId: String(seed.adminId) })),
      projectId
    );

    expect((await loadProject(projectId)).leadCoordinatorId).toBe(seed.adminId);
  });

  test('rejects a coordinator who tries to change the lead coordinator', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.coordinatorId);
    const before = await loadProject(projectId);

    const result = await updateProject(
      projectId,
      {},
      buildFormData({ name: 'Should not persist', leadCoordinatorId: String(seed.adminId) })
    );

    expect(result.errors?.leadCoordinatorId).toEqual([
      'Solo un administrador puede cambiar el coordinador responsable.',
    ]);
    expect(await loadProject(projectId)).toEqual(before);
    expect(await auditLogsFor(projectId)).toEqual([]);
  });

  test('persists and audits a change of strategic lines', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);

    await expectRedirectToProject(
      updateProject(
        projectId,
        {},
        buildFormData({ strategicLineIds: [String(seed.strategicLineIds[1])] })
      ),
      projectId
    );

    expect((await loadProject(projectId)).strategicLines).toEqual([
      { id: seed.strategicLineIds[1] },
    ]);
    expect(await auditLogsFor(projectId)).toEqual([
      expect.objectContaining({
        entity: 'project',
        details: expect.objectContaining({ changedFields: ['strategicLines'] }),
      }),
    ]);
  });

  test('rejects an inactive strategic line without touching the project', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);
    const unknownLineId = Math.max(0, ...seed.strategicLineIds) + 1000;

    const result = await updateProject(
      projectId,
      {},
      buildFormData({ name: 'Should not persist', strategicLineIds: [String(unknownLineId)] })
    );

    expect(result.errors?.strategicLineIds).toEqual(['Elegí líneas estratégicas activas']);
    expect(await loadProject(projectId)).toEqual(before);
  });

  test('rejects a name already used by another project in the same start year', async () => {
    const otherId = await createProjectFixture();
    await prisma.project.update({ where: { id: otherId }, data: { name: 'Taken name' } });
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);

    const result = await updateProject(projectId, {}, buildFormData({ name: 'taken name' }));

    expect(result.errors?.name).toHaveLength(1);
    expect(await loadProject(projectId)).toEqual(before);
  });

  test('replaces the cover with a placeholder and clears the crop when it is removed', async () => {
    const projectId = await createProjectFixture();
    await prisma.project.update({
      where: { id: projectId },
      data: {
        coverPhoto: '/images/project-placeholders/1.webp',
        coverCrop: { x: 0, y: 0, width: 50, height: 50 },
      },
    });
    signInAs(seed.adminId);

    await expectRedirectToProject(
      updateProject(
        projectId,
        {},
        buildFormData({
          removeCoverPhoto: 'true',
          projectPlaceholder: '/images/project-placeholders/2.webp',
        })
      ),
      projectId
    );

    expect(await loadProject(projectId)).toMatchObject({
      coverPhoto: '/images/project-placeholders/2.webp',
      coverCrop: null,
    });
    expect(await auditLogsFor(projectId)).toEqual([
      expect.objectContaining({
        details: expect.objectContaining({ changedFields: ['coverPhoto', 'coverCrop'] }),
      }),
    ]);
  });

  test('persists a new crop of the current cover', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const coverCrop = { x: 10, y: 20, width: 30, height: 40 };

    await expectRedirectToProject(
      updateProject(projectId, {}, buildFormData({ coverCrop: JSON.stringify(coverCrop) })),
      projectId
    );

    expect((await loadProject(projectId)).coverCrop).toEqual(coverCrop);
    expect(await auditLogsFor(projectId)).toEqual([
      expect.objectContaining({
        details: expect.objectContaining({ changedFields: ['coverCrop'] }),
      }),
    ]);
  });

  test('rejects an uploaded cover that is no longer available', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const before = await loadProject(projectId);

    const result = await updateProject(
      projectId,
      {},
      buildFormData({
        name: 'Should not persist',
        coverPhotoPath: '/uploads/covers/00000000-0000-4000-8000-000000000000.webp',
      })
    );

    expect(result.formError).toBe(
      'La imagen de portada que elegiste ya no está disponible. Elegí otra.'
    );
    expect(await loadProject(projectId)).toEqual(before);
  });
});

describe('createProject counterparty (integration)', () => {
  test.each(['publicSector', 'privateSector', 'internationalCooperation'])(
    'persists counterparty %s when creating a project',
    async (counterpartyType) => {
      signInAs(seed.adminId);
      const name = `Counterparty ${counterpartyType}`;
      await expect(
        createProject({}, buildFormData({ name, counterpartyTypes: [counterpartyType] }))
      ).rejects.toThrow(/^NEXT_REDIRECT:\/dashboard\/projects\/\d+$/);
      const project = await prisma.project.findFirstOrThrow({ where: { name } });
      createdProjectIds.push(project.id);
      expect((await loadProject(project.id)).counterpartyTypes).toEqual([counterpartyType]);
    }
  );
});

describe('project partners (integration)', () => {
  let createdPartnerIds: number[] = [];

  afterEach(async () => {
    await prisma.partner.deleteMany({ where: { id: { in: createdPartnerIds } } });
    createdPartnerIds = [];
  });

  async function createPartner(
    name: string,
    counterpartyType: 'publicSector' | 'privateSector',
    isActive = true
  ) {
    const partner = await prisma.partner.create({ data: { name, counterpartyType, isActive } });
    createdPartnerIds.push(partner.id);
    return partner;
  }

  function partnersOf(projectId: number) {
    return prisma.partner.findMany({
      where: { projects: { some: { id: projectId } } },
      orderBy: { id: 'asc' },
      select: { id: true },
    });
  }

  test('creates a project with partners of several counterparties', async () => {
    signInAs(seed.adminId);
    const publicPartner = await createPartner('Public partner', 'publicSector');
    const privatePartner = await createPartner('Private partner', 'privateSector');
    const name = 'Project with partners';
    await expect(
      createProject(
        {},
        buildFormData({
          name,
          counterpartyTypes: ['publicSector', 'privateSector'],
          partnerIds: [String(publicPartner.id), String(privatePartner.id)],
        })
      )
    ).rejects.toThrow(/^NEXT_REDIRECT:/);
    const project = await prisma.project.findFirstOrThrow({ where: { name } });
    createdProjectIds.push(project.id);
    expect(await partnersOf(project.id)).toEqual([
      { id: publicPartner.id },
      { id: privatePartner.id },
    ]);
  });

  test('saves a project without partners', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    await expectRedirectToProject(updateProject(projectId, {}, buildFormData()), projectId);
    expect(await partnersOf(projectId)).toEqual([]);
  });

  test('replaces the partners and records the names in the audit log', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const first = await createPartner('First partner', 'publicSector');
    const second = await createPartner('Second partner', 'publicSector');
    await expectRedirectToProject(
      updateProject(projectId, {}, buildFormData({ partnerIds: [String(first.id)] })),
      projectId
    );
    await expectRedirectToProject(
      updateProject(projectId, {}, buildFormData({ partnerIds: [String(second.id)] })),
      projectId
    );
    expect(await partnersOf(projectId)).toEqual([{ id: second.id }]);
    expect((await auditLogsFor(projectId)).at(-1)).toEqual(
      expect.objectContaining({
        details: {
          changedFields: ['partners'],
          changes: [
            {
              field: 'partners',
              from: [{ id: first.id, name: first.name }],
              to: [{ id: second.id, name: second.name }],
            },
          ],
        },
      })
    );
  });

  test('rejects a partner of a counterparty the project does not have', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const partner = await createPartner('Private partner', 'privateSector');
    const result = await updateProject(
      projectId,
      {},
      buildFormData({ partnerIds: [String(partner.id)] })
    );
    expect(result.errors?.partnerIds).toBeDefined();
    expect(await partnersOf(projectId)).toEqual([]);
  });

  test('rejects removing a counterparty while keeping its partners', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const partner = await createPartner('Public partner', 'publicSector');
    await expectRedirectToProject(
      updateProject(projectId, {}, buildFormData({ partnerIds: [String(partner.id)] })),
      projectId
    );
    const result = await updateProject(
      projectId,
      {},
      buildFormData({ counterpartyTypes: ['privateSector'], partnerIds: [String(partner.id)] })
    );
    expect(result.errors?.partnerIds).toBeDefined();
    expect((await loadProject(projectId)).counterpartyTypes).toEqual(['publicSector']);
  });

  test('rejects a deleted partner', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const partner = await createPartner('Deleted partner', 'publicSector', false);
    const result = await updateProject(
      projectId,
      {},
      buildFormData({ partnerIds: [String(partner.id)] })
    );
    expect(result.errors?.partnerIds).toBeDefined();
  });

  test('does not allow deleting a partner while a project uses it', async () => {
    const projectId = await createProjectFixture();
    signInAs(seed.adminId);
    const partner = await createPartner('Used partner', 'publicSector');
    await expectRedirectToProject(
      updateProject(projectId, {}, buildFormData({ partnerIds: [String(partner.id)] })),
      projectId
    );
    expect((await deletePartner(partner.id)).formError).toContain('asociado a proyectos');
  });
});
