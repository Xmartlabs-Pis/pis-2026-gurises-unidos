import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  listProjects: vi.fn(),
  listBeneficiaryYears: vi.fn(),
  listProjectFilterOptions: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

vi.mock('@/auth', () => ({ auth: mocks.auth }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/lib/projects/list', () => ({
  listProjects: mocks.listProjects,
  listBeneficiaryYears: mocks.listBeneficiaryYears,
  listProjectFilterOptions: mocks.listProjectFilterOptions,
}));
vi.mock('@/components/projects/projects-card-listing', () => ({ ProjectsCardList: () => null }));

import ProjectsPage from '@/app/(protected)/dashboard/projects/page';

type ListingProps = {
  status: string;
  beneficiaryYear?: number;
  departmentId?: number;
  topicId?: number;
  strategicLineId?: number;
  beneficiaryCategoryId?: number;
  search?: string;
};

async function renderProjects(params: Record<string, string | string[]>) {
  const page = (await ProjectsPage({ searchParams: Promise.resolve(params) })) as ReactElement<{
    children: ReactElement<object, (props: object) => Promise<ReactElement<ListingProps>>>;
  }>;
  const projects = page.props.children;
  return (await projects.type(projects.props)).props;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: '1' } });
  mocks.listBeneficiaryYears.mockResolvedValue([2026, 2025]);
  mocks.listProjectFilterOptions.mockResolvedValue({
    departments: [{ id: 2, name: 'Montevideo' }],
    topics: [{ id: 1, name: 'Educación' }],
    strategicLines: [{ id: 5, name: 'Formación' }],
    beneficiaryCategories: [{ id: 3, name: 'Familias' }],
  });
  mocks.listProjects.mockResolvedValue({ items: [], total: 0, page: 1, totalPages: 0 });
});

describe('ProjectsPage url params', () => {
  it('applies the defaults when there are no params', async () => {
    const props = await renderProjects({});

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(props).toMatchObject({ status: 'active', beneficiaryYear: 2026 });
  });

  it('keeps valid filters without redirecting', async () => {
    const props = await renderProjects({
      status: 'inactive',
      beneficiaryYear: '2025',
      departmentId: '2',
      topicId: '1',
      strategicLineId: '5',
      beneficiaryCategoryId: '3',
      search: 'centro',
    });

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(props).toMatchObject({
      status: 'inactive',
      beneficiaryYear: 2025,
      departmentId: 2,
      topicId: 1,
      strategicLineId: 5,
      beneficiaryCategoryId: 3,
      search: 'centro',
    });
  });

  it('keeps the explicit "all" values', async () => {
    const props = await renderProjects({ status: 'all', beneficiaryYear: 'all' });

    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(props).toMatchObject({ status: 'all', beneficiaryYear: undefined });
  });

  it.each([
    [{ status: 'dsfhj' }, '/dashboard/projects'],
    [{ status: 'active', sasasasa: 'abcd' }, '/dashboard/projects?status=active'],
    [{ beneficiaryYear: 'abc' }, '/dashboard/projects'],
    [{ beneficiaryYear: '2010' }, '/dashboard/projects'],
    [{ departmentId: '999', topicId: '1' }, '/dashboard/projects?topicId=1'],
    [{ strategicLineId: '999', topicId: '1' }, '/dashboard/projects?topicId=1'],
    [{ beneficiaryCategoryId: '999', topicId: '1' }, '/dashboard/projects?topicId=1'],
    [{ status: ['inactive', 'active'] }, '/dashboard/projects?status=inactive'],
    [{ search: '   ' }, '/dashboard/projects'],
    [{ page: '3', status: 'inactive' }, '/dashboard/projects?status=inactive'],
  ])('redirects %j to %s', async (params, expected) => {
    await expect(renderProjects(params)).rejects.toThrow(`NEXT_REDIRECT:${expected}`);
    expect(mocks.listProjects).not.toHaveBeenCalled();
  });
});
