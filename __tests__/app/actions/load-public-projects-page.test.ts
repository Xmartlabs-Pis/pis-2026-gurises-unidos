import { beforeEach, expect, test, vi } from 'vitest';
import { loadPublicProjectsPage } from '@/app/actions/public-projects';

const mocks = vi.hoisted(() => ({
  getPublicProjectsPage: vi.fn(),
}));

vi.mock('@/lib/projects/public-projects', () => ({
  getPublicProjectsPage: mocks.getPublicProjectsPage,
}));

const PAGE = { items: [], page: 2, hasMore: true };

beforeEach(() => {
  mocks.getPublicProjectsPage.mockReset().mockResolvedValue(PAGE);
});

test('loads the requested page for a valid topic', async () => {
  const result = await loadPublicProjectsPage(2025, 3, 2);

  expect(result).toBe(PAGE);
  expect(mocks.getPublicProjectsPage).toHaveBeenCalledWith(2025, 3, 2);
});

test.each([
  ['topic', 2025, 0, 2],
  ['topic', 2025, -1, 2],
  ['topic', 2025, 1.5, 2],
  ['topic', 2025, Number.NaN, 2],
  ['page', 2025, 3, 0],
  ['page', 2025, 3, Number.NaN],
  ['year', Number.NaN, 3, 2],
])('returns an empty page without querying for an invalid %s', async (_, year, topicId, page) => {
  const result = await loadPublicProjectsPage(year, topicId, page);

  expect(result).toEqual({ items: [], page: 1, hasMore: false });
  expect(mocks.getPublicProjectsPage).not.toHaveBeenCalled();
});
