import { describe, expect, test, vi } from 'vitest';
import { prismaMock } from '../../mocks/prisma';
import { listBeneficiaryYears, listProjectFilterOptions, listProjects } from '@/lib/projects/list';
import {
  PROJECT_LIST_MAX_PAGE_SIZE,
  PROJECT_LIST_PAGE_SIZE,
  PROJECT_SEARCH_MAX_LENGTH,
  parseProjectFilters,
  type RawProjectFilters,
} from '@/lib/validation/project-filters';
import { beneficiaryValueRows } from '../../mocks/beneficiary-values';

const CARLOS = { id: 3, firstName: 'Carlos', lastName: 'Coordinator' };
const DIANA = { id: 4, firstName: 'Diana', lastName: 'Coordinator' };
const MONTEVIDEO = { id: 1, name: 'Montevideo' };
const CANELONES = { id: 2, name: 'Canelones' };

const RECORD_2025 = {
  year: 2025,
  directChildrenAdolescents: 10,
  indirectChildrenAdolescents: 5,
  youth18To29: 3,
  families: 2,
  coordinatedInstitutions: 1,
  communityLeaders: 4,
  basicServiceStaff: 6,
};

const RECORD_2024 = {
  year: 2024,
  directChildrenAdolescents: 8,
  indirectChildrenAdolescents: 0,
  youth18To29: 0,
  families: 2,
  coordinatedInstitutions: 0,
  communityLeaders: 0,
  basicServiceStaff: 0,
};

function toBeneficiaryRow({ year, ...counts }: typeof RECORD_2025) {
  return { year, values: beneficiaryValueRows(counts) };
}

const PROJECTS = [
  {
    id: 1,
    name: 'Centro comunitario',
    status: 'active',
    intensity: 'high',
    startYear: 2018,
    zone: 'city',
    localityNeighborhood: 'Cerro',
    leadCoordinator: CARLOS,
    department: MONTEVIDEO,
    projectBeneficiaries: [toBeneficiaryRow(RECORD_2025), toBeneficiaryRow(RECORD_2024)],
  },
  {
    id: 2,
    name: 'Escuela rural',
    status: 'inactive',
    intensity: 'low',
    startYear: 2021,
    zone: 'rural',
    localityNeighborhood: null,
    leadCoordinator: DIANA,
    department: CANELONES,
    projectBeneficiaries: [],
  },
];

async function listWith(raw: RawProjectFilters, rows = PROJECTS) {
  prismaMock.project.count.mockResolvedValue(rows.length);
  prismaMock.project.findMany.mockResolvedValue(rows);

  return listProjects(parseProjectFilters(raw));
}

function findManyArgs() {
  return prismaMock.project.findMany.mock.calls[0][0];
}

describe('AC1: paginated listing with each project data', () => {
  test('exposes name, status, lead coordinator, start year, territory, intensity and beneficiaries', async () => {
    const { items } = await listWith({});

    expect(items[0]).toEqual({
      id: 1,
      name: 'Centro comunitario',
      status: 'active',
      intensity: 'high',
      startYear: 2018,
      zone: 'city',
      localityNeighborhood: 'Cerro',
      leadCoordinator: CARLOS,
      department: MONTEVIDEO,
      beneficiaries: [
        { ...RECORD_2025, total: 31 },
        { ...RECORD_2024, total: 10 },
      ],
    });
    expect(items[1].beneficiaries).toEqual([]);
  });

  test('requests only the latest beneficiary year', async () => {
    await listWith({});

    const { projectBeneficiaries } = findManyArgs().select;

    expect(projectBeneficiaries.orderBy).toEqual({ year: 'desc' });
    expect(projectBeneficiaries.take).toBe(1);
    expect(projectBeneficiaries.where).toStrictEqual({ year: undefined });
  });

  test('lists projects alphabetically by name', async () => {
    await listWith({});

    expect(findManyArgs().orderBy).toEqual([{ name: 'asc' }, { id: 'asc' }]);
  });

  test('requests the first page with the default page size', async () => {
    const result = await listWith({});

    expect(result).toMatchObject({ page: 1, pageSize: PROJECT_LIST_PAGE_SIZE, totalPages: 1 });
    expect(findManyArgs()).toMatchObject({ skip: 0, take: PROJECT_LIST_PAGE_SIZE });
  });

  test('computes the page window and total pages for a later page', async () => {
    prismaMock.project.count.mockResolvedValue(53);
    prismaMock.project.findMany.mockResolvedValue([]);

    const result = await listProjects(parseProjectFilters({ page: '3', pageSize: '20' }));

    expect(result).toMatchObject({ total: 53, page: 3, pageSize: 20, totalPages: 3 });
    expect(findManyArgs()).toMatchObject({ skip: 40, take: 20 });
  });

  test('falls back to the last page when the requested page is past the end', async () => {
    prismaMock.project.count.mockResolvedValue(53);
    prismaMock.project.findMany.mockResolvedValue([]);

    const result = await listProjects(parseProjectFilters({ page: '10', pageSize: '20' }));

    expect(result.page).toBe(3);
    expect(findManyArgs()).toMatchObject({ skip: 40, take: 20 });
  });

  test('ignores invalid page values and clamps the page size to the maximum', async () => {
    const result = await listWith({ page: '-2', pageSize: 'lots' });

    expect(result).toMatchObject({ page: 1, pageSize: PROJECT_LIST_PAGE_SIZE });

    const clamped = await listWith({ pageSize: String(PROJECT_LIST_MAX_PAGE_SIZE + 1) });

    expect(clamped.pageSize).toBe(PROJECT_LIST_MAX_PAGE_SIZE);
  });
});

describe('AC2: filters', () => {
  test('by status', async () => {
    await listWith({ status: 'inactive' });

    expect(findManyArgs().where).toEqual({ deletedAt: null, status: 'inactive' });
  });

  test('by lead coordinator', async () => {
    await listWith({ leadCoordinatorId: '4' });

    expect(findManyArgs().where).toEqual({ deletedAt: null, leadCoordinatorId: 4 });
  });

  test('by start year range', async () => {
    await listWith({ startYearFrom: '2019', startYearTo: '2022' });

    expect(findManyArgs().where).toEqual({ deletedAt: null, startYear: { gte: 2019, lte: 2022 } });
  });

  test('by start year range with only one bound', async () => {
    await listWith({ startYearTo: '2020' });

    expect(findManyArgs().where).toEqual({
      deletedAt: null,
      startYear: { gte: undefined, lte: 2020 },
    });
  });

  test('by intensity', async () => {
    await listWith({ intensity: 'high' });

    expect(findManyArgs().where).toEqual({ deletedAt: null, intensity: 'high' });
  });

  test('by department', async () => {
    await listWith({ departmentId: '2' });

    expect(findManyArgs().where).toEqual({ deletedAt: null, departmentId: 2 });
  });

  test('by name, ignoring case and accents', async () => {
    await listWith({ search: 'ÓÑÁS Ü' });

    expect(findManyArgs().where).toEqual({
      deletedAt: null,
      searchName: { contains: 'onas u' },
    });
  });

  test('by name, matching LIKE wildcards literally', async () => {
    await listWith({ search: '100%_\\' });

    expect(findManyArgs().where).toEqual({
      deletedAt: null,
      searchName: { contains: '100\\%\\_\\\\' },
    });
  });

  test('combines several filters with AND', async () => {
    await listWith({ status: 'active', leadCoordinatorId: '3', startYearFrom: '2015' });

    expect(findManyArgs().where).toEqual({
      deletedAt: null,
      status: 'active',
      leadCoordinatorId: 3,
      startYear: { gte: 2015, lte: undefined },
    });
  });

  test('applies the same filters to the total count', async () => {
    await listWith({ status: 'active', departmentId: '1', beneficiaryYear: '2025' });

    expect(prismaMock.project.count).toHaveBeenCalledWith({
      where: {
        deletedAt: null,
        status: 'active',
        departmentId: 1,
        projectBeneficiaries: { some: { year: 2025 } },
      },
    });
  });

  test('ignores filters with invalid values', async () => {
    await listWith({
      status: 'deleted',
      intensity: 'extreme',
      leadCoordinatorId: 'abc',
      departmentId: '0',
      startYearFrom: '1500',
      startYearTo: '3000',
      beneficiaryYear: '3000',
    });

    expect(findManyArgs().where).toEqual({ deletedAt: null });
  });

  test('resets to the first page when the page is beyond the filtered results', async () => {
    prismaMock.project.count.mockResolvedValue(1);
    prismaMock.project.findMany.mockResolvedValue([PROJECTS[1]]);

    const result = await listProjects(parseProjectFilters({ status: 'inactive', page: '4' }));

    expect(result).toMatchObject({ page: 1, total: 1, totalPages: 1 });
    expect(result.items.map((item) => item.name)).toEqual(['Escuela rural']);
  });

  test('by beneficiary year', async () => {
    await listWith({ beneficiaryYear: '2025' });

    expect(findManyArgs().where).toEqual({
      deletedAt: null,
      projectBeneficiaries: { some: { year: 2025 } },
    });
  });

  test('requests only the selected beneficiary year', async () => {
    await listWith({ beneficiaryYear: '2025' });

    expect(findManyArgs().select.projectBeneficiaries.where).toEqual({ year: 2025 });
  });
});

describe('AC3: no projects', () => {
  test('returns an empty page with a single page when there are no projects', async () => {
    const result = await listWith({}, []);

    expect(result).toEqual({
      items: [],
      total: 0,
      page: 1,
      pageSize: PROJECT_LIST_PAGE_SIZE,
      totalPages: 1,
    });
  });

  test('returns an empty page when no project matches the filters', async () => {
    const result = await listWith({ status: 'inactive', leadCoordinatorId: '3' }, []);

    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
    expect(prismaMock.project.findMany).not.toHaveBeenCalled();
  });
});

describe('parseProjectFilters', () => {
  test('returns defaults when no params are given', () => {
    expect(parseProjectFilters({})).toEqual({ page: 1, pageSize: PROJECT_LIST_PAGE_SIZE });
  });

  test('treats an empty or blank search as absent', () => {
    expect(parseProjectFilters({ search: '' }).search).toBeUndefined();
    expect(parseProjectFilters({ search: '   ' }).search).toBeUndefined();
  });

  test('swaps an inverted year range', () => {
    const filters = parseProjectFilters({ startYearFrom: '2022', startYearTo: '2018' });

    expect(filters.startYearFrom).toBe(2018);
    expect(filters.startYearTo).toBe(2022);
  });

  test('truncates a long search instead of dropping it', () => {
    const search = 'a'.repeat(PROJECT_SEARCH_MAX_LENGTH + 20);

    expect(parseProjectFilters({ search })?.search).toBe('a'.repeat(PROJECT_SEARCH_MAX_LENGTH));
  });

  test('accepts the current year as read at parse time', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2031-01-01T12:00:00.000Z'));

    expect(parseProjectFilters({ startYearFrom: '2031' }).startYearFrom).toBe(2031);
    expect(parseProjectFilters({ startYearFrom: '2032' }).startYearFrom).toBeUndefined();

    vi.useRealTimers();
  });

  test('uses the first value of repeated params', () => {
    expect(parseProjectFilters({ status: ['inactive', 'active'] }).status).toBe('inactive');
  });

  test('parses the beneficiary year and ignores invalid ones', () => {
    expect(parseProjectFilters({ beneficiaryYear: '2025' }).beneficiaryYear).toBe(2025);
    expect(parseProjectFilters({ beneficiaryYear: 'abc' }).beneficiaryYear).toBeUndefined();
    expect(parseProjectFilters({ beneficiaryYear: '3000' }).beneficiaryYear).toBeUndefined();
  });
});

describe('listBeneficiaryYears', () => {
  test('returns the distinct beneficiary years of non deleted projects, newest first', async () => {
    prismaMock.projectBeneficiary.findMany.mockResolvedValue([{ year: 2026 }, { year: 2024 }]);

    expect(await listBeneficiaryYears()).toEqual([2026, 2024]);
    expect(prismaMock.projectBeneficiary.findMany).toHaveBeenCalledWith({
      where: { project: { deletedAt: null } },
      distinct: ['year'],
      select: { year: true },
      orderBy: { year: 'desc' },
    });
  });
});

describe('listProjectFilterOptions', () => {
  test('returns all departments and only active topics, including those without projects', async () => {
    prismaMock.department.findMany.mockResolvedValue([MONTEVIDEO]);
    prismaMock.topic.findMany.mockResolvedValue([{ id: 1, name: 'Education' }]);

    expect(await listProjectFilterOptions()).toEqual({
      departments: [MONTEVIDEO],
      topics: [{ id: 1, name: 'Education' }],
    });
    expect(prismaMock.department.findMany).toHaveBeenCalledWith({
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
    expect(prismaMock.topic.findMany).toHaveBeenCalledWith({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  });
});

test('combines topic and department with the other project filters', async () => {
  await listWith({
    topicId: '2',
    departmentId: '3',
    beneficiaryYear: '2025',
    status: 'active',
    intensity: 'high',
    search: 'Centro',
  });
  expect(findManyArgs().where).toEqual({
    deletedAt: null,
    topicId: 2,
    departmentId: 3,
    projectBeneficiaries: { some: { year: 2025 } },
    status: 'active',
    intensity: 'high',
    searchName: { contains: 'centro' },
  });
});

test('ignores invalid topic and department IDs', () => {
  expect(parseProjectFilters({ topicId: '-1', departmentId: 'invalid' })).toMatchObject({
    topicId: undefined,
    departmentId: undefined,
  });
});
