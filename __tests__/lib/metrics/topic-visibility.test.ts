import { beforeEach, describe, expect, it, vi } from 'vitest';

const { topicsMock } = vi.hoisted(() => ({
  topicsMock: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: { topic: { findMany: topicsMock } },
}));

import { getTopicVisibilitySettings } from '@/lib/metrics/topic-visibility';

describe('getTopicVisibilitySettings', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    topicsMock.mockResolvedValue([
      { id: 1, name: 'Education', showPublicly: true, _count: { projects: 3 } },
      { id: 2, name: 'Health', showPublicly: false, _count: { projects: 0 } },
      { id: 3, name: 'Participation', showPublicly: true, _count: { projects: 2 } },
    ]);
  });

  it('loads saved visibility, retains zero counts and shows unconfigured topics', async () => {
    expect(await getTopicVisibilitySettings(2025)).toEqual([
      { id: 1, name: 'Education', projectCount: 3, showPublicly: true },
      { id: 2, name: 'Health', projectCount: 0, showPublicly: false },
      { id: 3, name: 'Participation', projectCount: 2, showPublicly: true },
    ]);
  });

  it('counts only public nondeleted projects in the reference year', async () => {
    await getTopicVisibilitySettings(2024);
    expect(topicsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true },
        select: expect.objectContaining({
          _count: {
            select: {
              projects: {
                where: {
                  deletedAt: null,
                  showOnLanding: true,
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
