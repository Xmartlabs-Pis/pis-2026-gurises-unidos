import { describe, expect, it } from 'vitest';
import {
  PROJECT_LIST_PAGE_SIZE,
  resolveProjectListFilters,
} from '@/lib/validation/project-filters';

const OPTIONS = {
  years: [2026, 2025],
  departments: [{ id: 2 }],
  topics: [{ id: 1 }],
  strategicLines: [{ id: 5 }],
  beneficiaryCategories: [{ id: 3 }],
};

describe('resolveProjectListFilters', () => {
  it('applies the default status and year when there are no params', () => {
    const { canonical, filters } = resolveProjectListFilters({}, OPTIONS);

    expect(canonical).toEqual({
      status: undefined,
      beneficiaryYear: undefined,
      search: undefined,
      departmentId: undefined,
      topicId: undefined,
      strategicLineId: undefined,
      beneficiaryCategoryId: undefined,
    });
    expect(filters).toMatchObject({
      status: 'active',
      beneficiaryYear: 2026,
      page: 1,
      pageSize: PROJECT_LIST_PAGE_SIZE,
    });
  });

  it('keeps valid filters', () => {
    const { canonical, filters } = resolveProjectListFilters(
      {
        status: 'inactive',
        beneficiaryYear: '2025',
        departmentId: '2',
        topicId: '1',
        strategicLineId: '5',
        beneficiaryCategoryId: '3',
        search: 'centro',
      },
      OPTIONS
    );

    expect(canonical).toEqual({
      status: 'inactive',
      beneficiaryYear: 2025,
      search: 'centro',
      departmentId: 2,
      topicId: 1,
      strategicLineId: 5,
      beneficiaryCategoryId: 3,
    });
    expect(filters).toMatchObject({
      status: 'inactive',
      beneficiaryYear: 2025,
      search: 'centro',
      departmentId: 2,
      topicId: 1,
      strategicLineId: 5,
      beneficiaryCategoryId: 3,
    });
  });

  it('keeps the explicit "all" values and filters by none', () => {
    const { canonical, filters } = resolveProjectListFilters(
      { status: 'all', beneficiaryYear: 'all' },
      OPTIONS
    );

    expect(canonical).toMatchObject({ status: 'all', beneficiaryYear: 'all' });
    expect(filters.status).toBeUndefined();
    expect(filters.beneficiaryYear).toBeUndefined();
  });

  it('falls back to the defaults for invalid status and year', () => {
    const { canonical, filters } = resolveProjectListFilters(
      { status: 'dsfhj', beneficiaryYear: 'abc' },
      OPTIONS
    );

    expect(canonical).toMatchObject({ status: undefined, beneficiaryYear: undefined });
    expect(filters).toMatchObject({ status: 'active', beneficiaryYear: 2026 });
  });

  it('drops years, departments, topics, strategic lines and beneficiary categories that are not available', () => {
    const { canonical, filters } = resolveProjectListFilters(
      {
        beneficiaryYear: '2010',
        departmentId: '999',
        topicId: '7',
        strategicLineId: '1',
        beneficiaryCategoryId: '5',
      },
      OPTIONS
    );

    expect(canonical).toMatchObject({
      beneficiaryYear: undefined,
      departmentId: undefined,
      topicId: undefined,
      strategicLineId: undefined,
      beneficiaryCategoryId: undefined,
    });
    expect(filters).toMatchObject({
      beneficiaryYear: 2026,
      departmentId: undefined,
      topicId: undefined,
      strategicLineId: undefined,
      beneficiaryCategoryId: undefined,
    });
  });

  it('ignores params that are not part of the listing', () => {
    const { canonical, filters } = resolveProjectListFilters(
      { page: '3', intensity: 'high', sasasasa: 'abcd' },
      OPTIONS
    );

    expect(canonical).not.toHaveProperty('page');
    expect(canonical).not.toHaveProperty('sasasasa');
    expect(filters.page).toBe(1);
    expect(filters.intensity).toBeUndefined();
  });

  it('shows every year when there are no beneficiary years yet', () => {
    const { filters } = resolveProjectListFilters({}, { ...OPTIONS, years: [] });

    expect(filters.beneficiaryYear).toBeUndefined();
  });
});
