import { expect, test, vi } from 'vitest';
import type { ReactElement } from 'react';
import { ProjectsByTopic } from '@/components/projects/projects-by-topic';

const mocks = vi.hoisted(() => ({
  getPublicTopics: vi.fn(),
}));

vi.mock('@/lib/projects/public-projects', () => ({ getPublicTopics: mocks.getPublicTopics }));
vi.mock('@/components/projects/topic-carousel', () => ({ TopicCarousel: () => null }));

test('renders one carousel per public topic with its total and first page', async () => {
  const initialPage = { items: [], page: 1, hasMore: true };
  mocks.getPublicTopics.mockResolvedValue([
    { id: 1, name: 'Education', total: 20, initialPage },
    { id: 3, name: 'Health', total: 2, initialPage },
  ]);

  const carousels = (await ProjectsByTopic({ year: 2025 })) as ReactElement<{
    topic: string;
    topicId: number;
    total: number;
  }>[];

  expect(mocks.getPublicTopics).toHaveBeenCalledWith(2025);
  expect(carousels.map(({ props }) => [props.topicId, props.topic, props.total])).toEqual([
    [1, 'Education', 20],
    [3, 'Health', 2],
  ]);
});
