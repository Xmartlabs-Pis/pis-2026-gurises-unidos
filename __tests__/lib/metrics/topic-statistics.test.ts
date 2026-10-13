import { beforeEach, describe, expect, it, vi } from 'vitest';

const { topicsMock, settingsMock } = vi.hoisted(() => ({
  topicsMock: vi.fn(),
  settingsMock: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: { topic: { findMany: topicsMock }, metric: { findMany: settingsMock } },
}));

import { getTopicStatistics } from '@/lib/metrics/topic-statistics';

describe('getTopicStatistics', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    topicsMock.mockResolvedValue([
      { id: 1, name: 'Education', _count: { projects: 3 } },
      { id: 2, name: 'Health', _count: { projects: 0 } },
      { id: 3, name: 'Participation', _count: { projects: 2 } },
    ]);
    settingsMock.mockResolvedValue([
      { key: 'topic_projects_1', showPublicly: true },
      { key: 'topic_projects_2', showPublicly: false },
    ]);
  });

  it('loads saved visibility, retains zero counts and shows unconfigured topics', async () => {
    expect(await getTopicStatistics(2025)).toEqual([
      { id: 1, name: 'Education', projectCount: 3, showPublicly: true },
      { id: 2, name: 'Health', projectCount: 0, showPublicly: false },
      { id: 3, name: 'Participation', projectCount: 2, showPublicly: true },
    ]);
  });

  it('counts nondeleted projects including hidden projects once per topic in the reference year', async () => {
    await getTopicStatistics(2024);
    expect(topicsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        select: expect.objectContaining({
          _count: {
            select: {
              projects: {
                where: {
                  deletedAt: null,
                  projectBeneficiaries: { some: { year: 2024 } },
                },
              },
            },
          },
        }),
      })
    );
  });
});
