import { beforeEach, expect, test, vi } from 'vitest';
import { loadProjectsPage } from '@/app/actions/projects';
import { PROJECT_LIST_PAGE_SIZE } from '@/lib/validation/project-filters';

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  listProjects: vi.fn(),
}));

vi.mock('@/lib/auth/require-user', () => ({ requireUser: mocks.requireUser }));
vi.mock('@/lib/projects/list', () => ({ listProjects: mocks.listProjects }));
vi.mock('@/lib/prisma', () => ({ default: {} }));

const PAGE = { items: [], total: 0, page: 2, pageSize: PROJECT_LIST_PAGE_SIZE, totalPages: 2 };

beforeEach(() => {
  mocks.requireUser.mockReset().mockResolvedValue({ id: 1, role: 'coordinator' });
  mocks.listProjects.mockReset().mockResolvedValue(PAGE);
});

test('lists the requested page with the given filters and the default page size', async () => {
  const result = await loadProjectsPage({ status: 'inactive', beneficiaryYear: '2024' }, 2);

  expect(result).toBe(PAGE);
  expect(mocks.listProjects).toHaveBeenCalledWith(
    expect.objectContaining({
      status: 'inactive',
      beneficiaryYear: 2024,
      page: 2,
      pageSize: PROJECT_LIST_PAGE_SIZE,
    })
  );
});

test('treats the all values as no filter', async () => {
  await loadProjectsPage({ status: 'all', beneficiaryYear: 'all' }, 3);

  const filters = mocks.listProjects.mock.calls[0][0];

  expect(filters.status).toBeUndefined();
  expect(filters.beneficiaryYear).toBeUndefined();
  expect(filters.page).toBe(3);
});

test('requires an authenticated user before listing', async () => {
  mocks.requireUser.mockRejectedValue(new Error('NEXT_REDIRECT'));

  await expect(loadProjectsPage({ status: 'active', beneficiaryYear: '2025' }, 2)).rejects.toThrow(
    'NEXT_REDIRECT'
  );
  expect(mocks.listProjects).not.toHaveBeenCalled();
});

test('preserves combined filters when loading another page', async () => {
  await loadProjectsPage(
    {
      status: 'active',
      beneficiaryYear: '2025',
      topicId: '2',
      departmentId: '3',
      search: 'Centro',
    },
    2
  );
  expect(mocks.listProjects).toHaveBeenCalledWith(
    expect.objectContaining({
      topicId: 2,
      departmentId: 3,
      search: 'Centro',
      page: 2,
    })
  );
});
