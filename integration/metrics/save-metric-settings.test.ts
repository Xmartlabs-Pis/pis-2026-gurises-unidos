import { afterEach, beforeAll, beforeEach, describe, expect, test, vi } from 'vitest';
import { saveMetricSettings } from '@/app/actions/metrics';
import type { Metric, PublicSettings } from '@/generated/prisma/client';
import { logAudit } from '@/lib/audit-log';
import { METRIC_DEFINITIONS } from '@/lib/metrics/constants';
import { getCurrentYear } from '@/lib/metrics/year';
import prisma from '@/lib/prisma';
import { loadSeedData, type SeedData } from '../fixtures';
import { deleteProject } from '../projects/project-helpers';
import { signInAs } from '../session';

const CURRENT_YEAR = getCurrentYear();
const PERMISSION_ERROR = {
  success: false,
  message: 'No tenés permisos para guardar las métricas.',
};

vi.mock('@/lib/audit-log', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/audit-log')>();
  return { ...actual, logAudit: vi.fn(actual.logAudit) };
});

let seed: SeedData;
let initialMetrics: Metric[];
let initialSettings: PublicSettings | null;
let initialTopics: { id: number; showPublicly: boolean }[];
let lastAuditLogId: number;
let createdProjectIds: number[] = [];

function buildInput(
  publishedYears = [CURRENT_YEAR - 1],
  publicKeys: string[] = [],
  topics: { id: number; showPublicly: boolean }[] = []
) {
  return {
    publishedYears,
    topics,
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
      counterpartyTypes: ['publicSector'],
      createdBy: seed.adminId,
      topics: { connect: { id: seed.topicIds[0] } },
      projectBeneficiaries: { create: { year, authorId: seed.coordinatorId } },
    },
  });
  createdProjectIds.push(project.id);
}

const PUBLIC_REPORT_ENTITIES = ['metric', 'topic', 'publicSettings'] as const;

function metricAuditLogs() {
  return prisma.auditLog.findMany({
    where: { entity: { in: [...PUBLIC_REPORT_ENTITIES] }, id: { gt: lastAuditLogId } },
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
  [initialMetrics, initialSettings, initialTopics] = await Promise.all([
    prisma.metric.findMany(),
    prisma.publicSettings.findUnique({ where: { id: 1 } }),
    prisma.topic.findMany({ select: { id: true, showPublicly: true } }),
  ]);
});

beforeEach(async () => {
  const lastAuditLog = await prisma.auditLog.findFirst({ orderBy: { id: 'desc' } });
  lastAuditLogId = lastAuditLog?.id ?? 0;
  await prisma.$transaction([
    prisma.metric.deleteMany(),
    prisma.publicSettings.deleteMany(),
    prisma.topic.updateMany({ data: { showPublicly: false } }),
  ]);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await prisma.$transaction([
    prisma.auditLog.deleteMany({
      where: { entity: { in: [...PUBLIC_REPORT_ENTITIES] }, id: { gt: lastAuditLogId } },
    }),
    ...initialTopics.map(({ id, showPublicly }) =>
      prisma.topic.update({ where: { id }, data: { showPublicly } })
    ),
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
  test('stores the published years newest first and every metric visibility', async () => {
    signInAs(seed.adminId, 'admin');

    expect(
      await saveMetricSettings(
        buildInput([CURRENT_YEAR - 1, CURRENT_YEAR], ['families', 'active_projects'])
      )
    ).toEqual({ success: true, message: 'Cambios guardados.' });

    const { settings, metrics } = await loadMetricState();
    expect(settings).toMatchObject({
      publishedYears: [CURRENT_YEAR, CURRENT_YEAR - 1],
      updatedBy: seed.adminId,
    });
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
  });

  test('audits the published years in a single entry with the previous and new values', async () => {
    signInAs(seed.adminId, 'admin');
    await saveMetricSettings(buildInput([CURRENT_YEAR - 1]));

    await saveMetricSettings(buildInput([CURRENT_YEAR - 1, CURRENT_YEAR]));

    const logs = (await metricAuditLogs()).filter(({ entity }) => entity === 'publicSettings');
    expect(logs).toHaveLength(2);
    expect(logs[1]).toMatchObject({
      action: 'update',
      entityId: 1,
      authorId: seed.adminId,
      details: {
        changes: [
          {
            field: 'publishedYears',
            from: [CURRENT_YEAR - 1],
            to: [CURRENT_YEAR, CURRENT_YEAR - 1],
          },
        ],
      },
    });
  });

  test('audits every changed metric card in one grouped entry', async () => {
    signInAs(seed.adminId, 'admin');
    const names = Object.fromEntries(METRIC_DEFINITIONS.map(({ key, name }) => [key, name]));
    await saveMetricSettings(buildInput());
    const baselineLogs = (await metricAuditLogs()).length;

    await saveMetricSettings(buildInput([CURRENT_YEAR - 1], ['families', 'active_projects']));

    const logs = (await metricAuditLogs())
      .slice(baselineLogs)
      .filter(({ entity }) => entity === 'metric');
    expect(logs).toEqual([
      expect.objectContaining({
        action: 'update',
        entityId: null,
        authorId: seed.adminId,
        details: {
          changes: [
            { field: names.families, from: false, to: true },
            { field: names.active_projects, from: false, to: true },
          ],
        },
      }),
    ]);
  });

  test('audits every changed topic in one grouped entry and skips unchanged ones', async () => {
    signInAs(seed.adminId, 'admin');
    const [first, second, third] = await prisma.topic.findMany({
      where: { id: { in: seed.topicIds } },
      orderBy: { id: 'asc' },
    });
    const topics = [
      { id: first.id, showPublicly: true },
      { id: second.id, showPublicly: true },
      { id: third.id, showPublicly: false },
    ];

    await saveMetricSettings(buildInput([CURRENT_YEAR - 1], [], topics));

    const logs = (await metricAuditLogs()).filter(({ entity }) => entity === 'topic');
    expect(logs).toEqual([
      expect.objectContaining({
        action: 'update',
        entityId: null,
        authorId: seed.adminId,
        details: {
          changes: [
            { field: first.name, from: false, to: true },
            { field: second.name, from: false, to: true },
          ],
        },
      }),
    ]);
    const saved = await prisma.topic.findMany({
      where: { id: { in: topics.map(({ id }) => id) } },
    });
    expect(saved.map(({ id, showPublicly }) => ({ id, showPublicly }))).toEqual(
      expect.arrayContaining(topics)
    );
  });

  test('does not audit anything when nothing changed', async () => {
    signInAs(seed.adminId, 'admin');
    await saveMetricSettings(buildInput([CURRENT_YEAR - 1], ['families']));
    const before = (await metricAuditLogs()).length;

    expect(await saveMetricSettings(buildInput([CURRENT_YEAR - 1], ['families']))).toMatchObject({
      success: true,
    });

    expect(await metricAuditLogs()).toHaveLength(before);
  });

  test('updates the saved metrics in place when saving again', async () => {
    signInAs(seed.adminId, 'admin');
    await saveMetricSettings(buildInput([CURRENT_YEAR - 1], ['families']));
    const { metrics: firstMetrics } = await loadMetricState();

    expect(await saveMetricSettings(buildInput([CURRENT_YEAR], ['teachers']))).toMatchObject({
      success: true,
    });

    const { settings, metrics } = await loadMetricState();
    expect(settings?.publishedYears).toEqual([CURRENT_YEAR]);
    expect(metrics.map(({ id }) => id)).toEqual(firstMetrics.map(({ id }) => id));
    expect(metrics.filter(({ showPublicly }) => showPublicly).map(({ key }) => key)).toEqual([
      'teachers',
    ]);
  });

  test('accepts a past year that has beneficiaries loaded', async () => {
    await createProjectWithBeneficiaryYear(2015);
    signInAs(seed.adminId, 'admin');

    expect(await saveMetricSettings(buildInput([2015]))).toMatchObject({ success: true });

    expect((await loadMetricState()).settings?.publishedYears).toEqual([2015]);
  });

  test('rejects years without beneficiaries', async () => {
    signInAs(seed.adminId, 'admin');

    await expectRejected(buildInput([CURRENT_YEAR, 2001, CURRENT_YEAR + 1]), {
      success: false,
      message: `Estos años ya no están disponibles: 2001, ${CURRENT_YEAR + 1}. Recargá la página para actualizar la selección.`,
    });
  });

  test('rejects an empty or duplicated year selection', async () => {
    signInAs(seed.adminId, 'admin');
    const invalidSelection = { success: false, message: 'La selección de métricas no es válida.' };

    await expectRejected(buildInput([]), invalidSelection);
    await expectRejected(buildInput([CURRENT_YEAR, CURRENT_YEAR]), invalidSelection);
  });

  test('rejects an incomplete or duplicated metric selection', async () => {
    signInAs(seed.adminId, 'admin');
    const { publishedYears, metrics } = buildInput();
    const invalidSelection = { success: false, message: 'La selección de métricas no es válida.' };

    await expectRejected({ publishedYears, metrics: metrics.slice(1) }, invalidSelection);
    await expectRejected(
      { publishedYears, metrics: [metrics[0], ...metrics.slice(0, -1)] },
      invalidSelection
    );
    await expectRejected(
      { publishedYears, metrics: [{ key: 'unknown', showPublicly: true }, ...metrics.slice(1)] },
      invalidSelection
    );
  });

  test('rolls back every change when the audit entry fails', async () => {
    signInAs(seed.adminId, 'admin');
    vi.mocked(logAudit).mockClear().mockRejectedValue(new Error('Audit failure'));

    await expectRejected(buildInput([CURRENT_YEAR - 1], ['families']), {
      success: false,
      message: 'No se pudieron guardar los cambios. Intentá de nuevo.',
    });
    expect(vi.mocked(logAudit)).toHaveBeenCalled();
  });

  test('rejects a coordinator', async () => {
    signInAs(seed.coordinatorId, 'coordinator');

    await expectRejected(buildInput(), PERMISSION_ERROR);
  });

  test('rejects when nobody is signed in', async () => {
    await expectRejected(buildInput(), PERMISSION_ERROR);
  });
});
