import { expect, it } from 'vitest';
import { getVisibleTopics } from '@/lib/metrics/visible-topics';

it('selects nonempty visible topics in descending count without mutating the input', () => {
  const topics = [
    { id: 1, showPublicly: true, projectCount: 1 },
    { id: 2, showPublicly: false, projectCount: 10 },
    { id: 3, showPublicly: true, projectCount: 0 },
    { id: 4, showPublicly: true, projectCount: 5 },
  ];
  expect(getVisibleTopics(topics).map(({ id }) => id)).toEqual([4, 1]);
  expect(topics.map(({ id }) => id)).toEqual([1, 2, 3, 4]);
});
