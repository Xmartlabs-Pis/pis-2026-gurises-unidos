import { beforeEach, describe, expect, it, vi } from 'vitest';

const { topicsMock } = vi.hoisted(() => ({
  topicsMock: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: { topic: { findMany: topicsMock } },
}));

import { getTopicStatistics } from '@/lib/metrics/topic-statistics';

describe('getTopicStatistics', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    topicsMock.mockResolvedValue([
      { id: 1, name: 'Education', showPublicly: true, _count: { projects: 3 } },
      { id: 2, name: 'Health', showPublicly: false, _count: { projects: 0 } },
      { id: 3, name: 'Participation', showPublicly: true, _count: { projects: 2 } },
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
