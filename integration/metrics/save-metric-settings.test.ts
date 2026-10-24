import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { saveMetricSettings } from '@/app/actions/metrics';
import type { Metric, PublicSettings } from '@/generated/prisma/client';
import { logAudit } from '@/lib/audit-log';
import { METRIC_DEFINITIONS } from '@/lib/metrics/constants';
import prisma from '@/lib/prisma';
import { loadSeedData, type SeedData } from '../fixtures';
import { deleteProject } from '../projects/project-helpers';
import { signInAs } from '../session';

const CURRENT_YEAR = new Date().getFullYear();
const PERMISSION_ERROR = {
  success: false,
  message: 'No tenés permisos para guardar las métricas.',
};

vi.mock('@/lib/audit-log', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit-log')>();
  return { logAudit: vi.fn(actual.logAudit) };
});

let seed: SeedData;
let initialMetrics: Metric[];
let initialSettings: PublicSettings | null;
let lastAuditLogId: number;
let createdProjectIds: number[] = [];

function buildInput(year = CURRENT_YEAR - 1, publicKeys: string[] = []) {
  return {
    year,
    metrics: METRIC_DEFINITIONS.map(({ key }) => ({ key, showPublicly: publicKeys.includes(key) })),
  };
}

async function createProjectWithBeneficiaryYear(year: number) {
  const project = await prisma.project.create({
    data: {
      name: 'Project for metric years',
      status: 'inactive',
      intensity: 'high',
      startYear: year,
      endYear: year,
      leadCoordinatorId: seed.coordinatorId,
      departments: { connect: { id: seed.departmentIds[0] } },
      zone: 'rural',
      counterpartyType: 'publicSector',
      createdBy: seed.adminId,
      topics: { connect: { id: seed.topicIds[0] } },
      projectBeneficiaries: { create: { year, authorId: seed.coordinatorId } },
    },
  });
  createdProjectIds.push(project.id);
}

function metricAuditLogs() {
  return prisma.auditLog.findMany({
    where: { entity: 'metric', id: { gt: lastAuditLogId } },
    orderBy: { id: 'asc' },
  });
}

async function loadMetricState() {
  const [settings, metrics, auditLogs] = await Promise.all([
    prisma.publicSettings.findUnique({ where: { id: 1 } }),
    prisma.metric.findMany({ orderBy: { sortOrder: 'asc' } }),
    metricAuditLogs(),
  ]);
  return { settings, metrics, auditLogs };
}

async function expectRejected(input: unknown, expected: object) {
  const before = await loadMetricState();

  expect(await saveMetricSettings(input)).toEqual(expected);

  expect(await loadMetricState()).toEqual(before);
}

beforeAll(async () => {
  seed = await loadSeedData();
  [initialMetrics, initialSettings] = await Promise.all([
    prisma.metric.findMany(),
    prisma.publicSettings.findUnique({ where: { id: 1 } }),
  ]);
});

beforeEach(async () => {
  const lastAuditLog = await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } });
  lastAuditLogId = lastAuditLog?.id ?? 0;
});

afterEach(async () => {
  vi.restoreAllMocks();
  await prisma.$transaction([
    prisma.auditLog.deleteMany({ where: { entity: 'metric', id: { gt: lastAuditLogId } } }),
    prisma.metric.deleteMany({
      where: { key: { notIn: initialMetrics.map(({ key }) => key) } },
    }),
    ...initialMetrics.map((metric) =>
      prisma.metric.update({ where: { id: metric.id }, data: metric })
    ),
    initialSettings
      ? prisma.publicSettings.update({ where: { id: 1 }, data: initialSettings })
      : prisma.publicSettings.deleteMany(),
  ]);
  const ids = createdProjectIds;
  createdProjectIds = [];
  for (const id of ids) await deleteProject(id);
});

describe('saveMetricSettings (integration)', () => {
  test('stores the reference year and every metric visibility, and audits each metric', async () => {
    signInAs(seed.adminId, 'admin');

    expect(
      await saveMetricSettings(buildInput(CURRENT_YEAR - 1, ['families', 'active_projects']))
    ).toEqual({ success: true, message: 'Cambios guardados.' });

    const { settings, metrics, auditLogs } = await loadMetricState();
    expect(settings).toMatchObject({ referenceYear: CURRENT_YEAR - 1, updatedBy: seed.adminId });
    expect(metrics).toEqual(
      METRIC_DEFINITIONS.map(({ key, name }, index) =>
        expect.objectContaining({
          key,
          name,
          sortOrder: index,
          showPublicly: key === 'families' || key === 'active_projects',
          updatedBy: seed.adminId,
        })
      )
    );
    expect(auditLogs).toEqual(
      metrics.map(({ id }) =>
        expect.objectContaining({ action: 'update', entityId: id, authorId: seed.adminId })
      )
    );
  });

  test('updates the saved metrics in place when saving again', async () => {
    signInAs(seed.adminId, 'admin');
    await saveMetricSettings(buildInput(CURRENT_YEAR - 1, ['families']));
    const { metrics: firstMetrics } = await loadMetricState();

    expect(await saveMetricSettings(buildInput(CURRENT_YEAR, ['teachers']))).toMatchObject({
      success: true,
    });

    const { settings, metrics, auditLogs } = await loadMetricState();
    expect(settings?.referenceYear).toBe(CURRENT_YEAR);
    expect(metrics.map(({ id }) => id)).toEqual(firstMetrics.map(({ id }) => id));
    expect(metrics.filter(({ showPublicly }) => showPublicly).map(({ key }) => key)).toEqual([
      'teachers',
    ]);
    expect(auditLogs).toHaveLength(METRIC_DEFINITIONS.length * 2);
  });

  test('accepts a past year that has beneficiaries loaded', async () => {
    await createProjectWithBeneficiaryYear(2015);
    signInAs(seed.adminId, 'admin');

    expect(await saveMetricSettings(buildInput(2015))).toMatchObject({ success: true });

    expect((await loadMetricState()).settings?.referenceYear).toBe(2015);
  });

  test('rejects a year without beneficiaries', async () => {
    signInAs(seed.adminId, 'admin');

    await expectRejected(buildInput(2001), {
      success: false,
      message: 'El año de referencia no es válido.',
    });
    await expectRejected(buildInput(CURRENT_YEAR + 1), {
      success: false,
      message: 'El año de referencia no es válido.',
    });
  });

  test('rejects an incomplete or duplicated metric selection', async () => {
    signInAs(seed.adminId, 'admin');
    const { year, metrics } = buildInput();
    const invalidSelection = { success: false, message: 'La selección de métricas no es válida.' };

    await expectRejected({ year, metrics: metrics.slice(1) }, invalidSelection);
    await expectRejected(
      { year, metrics: [metrics[0], ...metrics.slice(0, -1)] },
      invalidSelection
    );
    await expectRejected(
      { year, metrics: [{ key: 'unknown', showPublicly: true }, ...metrics.slice(1)] },
      invalidSelection
    );
  });

  test('rolls back every change when a later metric fails', async () => {
    signInAs(seed.adminId, 'admin');
    const realLogAudit = vi.mocked(logAudit).getMockImplementation()!;
    vi.mocked(logAudit)
      .mockClear()
      .mockImplementationOnce(realLogAudit)
      .mockRejectedValueOnce(new Error('Audit failure'));

    await expectRejected(buildInput(CURRENT_YEAR - 1, ['families']), {
      success: false,
      message: 'No se pudieron guardar los cambios. Intentá de nuevo.',
    });
    expect(vi.mocked(logAudit)).toHaveBeenCalledTimes(2);
  });

  test('rejects a coordinator', async () => {
    signInAs(seed.coordinatorId, 'coordinator');

    await expectRejected(buildInput(), PERMISSION_ERROR);
  });

  test('rejects when nobody is signed in', async () => {
    await expectRejected(buildInput(), PERMISSION_ERROR);
  });
});
