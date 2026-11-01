import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  authMock,
  transactionMock,
  upsertMock,
  settingsUpsertMock,
  auditMock,
  revalidateMock,
  yearsMock,
  topicsMock,
  topicUpdateMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  transactionMock: vi.fn(),
  upsertMock: vi.fn(),
  settingsUpsertMock: vi.fn(),
  auditMock: vi.fn(),
  revalidateMock: vi.fn(),
  yearsMock: vi.fn(),
  topicsMock: vi.fn(),
  topicUpdateMock: vi.fn(),
}));

vi.mock('@/auth', () => ({ auth: authMock }));
vi.mock('@/lib/prisma', () => ({ default: { $transaction: transactionMock } }));
vi.mock('@/lib/audit-log', () => ({ logAudit: auditMock }));
vi.mock('@/lib/metrics/queries', () => ({ getMetricYears: yearsMock }));
vi.mock('next/cache', () => ({ revalidatePath: revalidateMock }));

import { saveMetricSettings } from '@/app/actions/metrics';
import { METRIC_DEFINITIONS } from '@/lib/metrics/constants';

const METRICS = METRIC_DEFINITIONS.map(({ key }) => ({
  key,
  showPublicly: key === 'direct_children_reached',
}));
const SETTINGS = { publishedYears: [2025], metrics: METRICS };

describe('saveMetricSettings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    authMock.mockResolvedValue({ user: { id: '1', role: 'admin' } });
    upsertMock.mockResolvedValue({ id: 1 });
    yearsMock.mockResolvedValue([2026, 2025, 2024]);
    transactionMock.mockImplementation(async (callback) =>
      callback({
        metric: { upsert: upsertMock },
        publicSettings: { upsert: settingsUpsertMock },
        topic: { findMany: topicsMock, update: topicUpdateMock },
      })
    );
  });

  it.each([null, { user: { id: '2', role: 'coordinator' } }])(
    'rejects unauthorized users',
    async (session) => {
      authMock.mockResolvedValue(session);
      expect((await saveMetricSettings(SETTINGS)).success).toBe(false);
      expect(transactionMock).not.toHaveBeenCalled();
    }
  );

  it.each(
    [
      METRICS.slice(1),
      METRICS.map(() => METRICS[0]),
      METRICS.map((metric) => ({ ...metric, showPublicly: 'true' })),
      METRICS.map((metric) => ({ ...metric, key: 'unknown' })),
    ].map((metrics) => ({ input: { publishedYears: [2025], metrics } }))
  )('rejects incomplete or invalid selections', async ({ input }) => {
    expect((await saveMetricSettings(input)).success).toBe(false);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it.each(
    [[], [2030], [1999], [2025.5], ['2025'], [2025, 2025], [2025, 2030]].map((publishedYears) => ({
      publishedYears,
    }))
  )('rejects invalid published years %j', async ({ publishedYears }) => {
    expect((await saveMetricSettings({ ...SETTINGS, publishedYears })).success).toBe(false);
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('persists enabled and disabled metrics and published years, and refreshes both pages', async () => {
    expect((await saveMetricSettings(SETTINGS)).success).toBe(true);
    expect(settingsUpsertMock).toHaveBeenCalledWith({
      where: { id: 1 },
      create: { id: 1, publishedYears: [2025], updatedBy: 1 },
      update: { publishedYears: [2025], updatedBy: 1 },
    });
    expect(upsertMock).toHaveBeenCalledTimes(7);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'direct_children_reached' },
        update: { showPublicly: true, updatedBy: 1 },
      })
    );
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'families' },
        update: { showPublicly: false, updatedBy: 1 },
      })
    );
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'indirect_children_reached' },
        update: { showPublicly: false, updatedBy: 1 },
      })
    );
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { key: 'children_reached' },
        update: { showPublicly: false, updatedBy: 1 },
      })
    );
    expect(auditMock).toHaveBeenCalledTimes(7);
    expect(revalidateMock).toHaveBeenCalledWith('/management/metrics');
    expect(revalidateMock).toHaveBeenCalledWith('/');
    expect(revalidateMock).toHaveBeenCalledTimes(2);
  });

  it('identifies years that become unavailable while the administrator is editing', async () => {
    const result = await saveMetricSettings({ ...SETTINGS, publishedYears: [2026, 2005] });
    expect(result.success).toBe(false);
    expect(result.message).toContain('2005');
    expect(result.message).toContain('Recargá la página');
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('reports a database failure without reporting success', async () => {
    transactionMock.mockRejectedValue(new Error('Database unavailable'));
    expect((await saveMetricSettings(SETTINGS)).success).toBe(false);
    expect(revalidateMock).not.toHaveBeenCalled();
  });

  it('sorts published years independently of the preview year', async () => {
    expect(
      (await saveMetricSettings({ ...SETTINGS, publishedYears: [2024, 2026], year: 2025 })).success
    ).toBe(true);
    expect(settingsUpsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        update: { publishedYears: [2026, 2024], updatedBy: 1 },
      })
    );
  });

  it('persists both enabled and disabled topic statistics', async () => {
    topicsMock.mockResolvedValue([
      { id: 1, name: 'Education' },
      { id: 2, name: 'Health' },
    ]);
    const result = await saveMetricSettings({
      ...SETTINGS,
      topics: [
        { id: 1, showPublicly: true },
        { id: 2, showPublicly: false },
      ],
    });
    expect(result.success).toBe(true);
    for (const [id, showPublicly] of [
      [1, true],
      [2, false],
    ]) {
      expect(topicUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id },
          data: { showPublicly },
        })
      );
    }
  });

  it('rejects unavailable topics before writing settings', async () => {
    topicsMock.mockResolvedValue([]);
    expect(
      (
        await saveMetricSettings({
          ...SETTINGS,
          topics: [{ id: 99, showPublicly: true }],
        })
      ).success
    ).toBe(false);
    expect(upsertMock).not.toHaveBeenCalled();
    expect(settingsUpsertMock).not.toHaveBeenCalled();
    expect(revalidateMock).not.toHaveBeenCalled();
  });

  it('rejects duplicate topic selections', async () => {
    expect(
      (
        await saveMetricSettings({
          ...SETTINGS,
          topics: [
            { id: 1, showPublicly: true },
            { id: 1, showPublicly: false },
          ],
        })
      ).success
    ).toBe(false);
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
