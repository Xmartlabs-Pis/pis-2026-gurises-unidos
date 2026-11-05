import { expect, test, vi } from 'vitest';
import type { ReactElement } from 'react';
import { render, screen } from '@testing-library/react';
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
    id: string;
    children: ReactElement<{
      topic: string;
      topicId: number;
      total: number;
    }>;
  }>[];

  expect(mocks.getPublicTopics).toHaveBeenCalledWith(2025);
  expect(
    carousels.map(
      ({
        props: {
          children: { props },
        },
      }) => [props.topicId, props.topic, props.total]
    )
  ).toEqual([
    [1, 'Education', 20],
    [3, 'Health', 2],
  ]);
  expect(carousels.map(({ props }) => props.id)).toEqual(['topic-1', 'topic-3']);
});

test('remounts carousels when the year changes to reset their loaded projects', async () => {
  mocks.getPublicTopics.mockResolvedValue([
    { id: 1, name: 'Education', total: 1, initialPage: { items: [], page: 1, hasMore: false } },
  ]);
  const previous = (await ProjectsByTopic({ year: 2025 })) as ReactElement[];
  const current = (await ProjectsByTopic({ year: 2026 })) as ReactElement[];
  expect(current[0].key).not.toBe(previous[0].key);
});

test('shows an empty state when no topics have published projects for the year', async () => {
  mocks.getPublicTopics.mockResolvedValue([]);
  render(await ProjectsByTopic({ year: 2026 }));
  expect(screen.getByText('No hay proyectos publicados para 2026.')).toBeDefined();
});
