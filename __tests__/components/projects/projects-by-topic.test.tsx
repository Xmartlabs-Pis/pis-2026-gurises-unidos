import { expect, test, vi } from 'vitest';
import type { ReactElement } from 'react';
import { ProjectsByTopic } from '@/components/projects/projects-by-topic';

const mocks = vi.hoisted(() => ({
  getPublicTopics: vi.fn(),
}));

vi.mock('@/lib/projects/public-projects', () => ({ getPublicTopics: mocks.getPublicTopics }));
vi.mock('@/components/projects/topic-carousel', () => ({ TopicCarousel: () => null }));

test('renders one carousel per public topic with its first page', async () => {
  const initialPage = { items: [], page: 1, hasMore: true };
  mocks.getPublicTopics.mockResolvedValue([
    { id: 1, name: 'Education', total: 20, initialPage },
    { id: 3, name: 'Health', total: 2, initialPage },
  ]);

  const carousels = (await ProjectsByTopic({ year: 2025 })) as ReactElement<{
    topic: string;
    topicId: number;
  }>[];

  expect(mocks.getPublicTopics).toHaveBeenCalledWith(2025);
  expect(carousels.map(({ props }) => [props.topicId, props.topic])).toEqual([
    [1, 'Education'],
    [3, 'Health'],
  ]);
});

test('remounts carousels when the year changes to reset their loaded projects', async () => {
  mocks.getPublicTopics.mockResolvedValue([
    { id: 1, name: 'Education', total: 1, initialPage: { items: [], page: 1, hasMore: false } },
  ]);
  const previous = await ProjectsByTopic({ year: 2025 });
  const current = await ProjectsByTopic({ year: 2026 });
  expect(current[0].key).not.toBe(previous[0].key);
});
