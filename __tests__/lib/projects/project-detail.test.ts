import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { prismaMock } from '../../mocks/prisma';
import type { BeneficiaryCounts } from '@/lib/project-display';
import { getProjectDetail } from '@/lib/projects/detail';
import { beneficiaryValueRows } from '../../mocks/beneficiary-values';

const { authMock, extraCategories } = vi.hoisted(() => ({
  authMock: vi.fn(),
  extraCategories: [] as { key: string; name: string }[],
}));

vi.mock('@/auth', () => ({
  auth: authMock,
}));

vi.mock('@/lib/beneficiary-categories', async () => {
  const { BENEFICIARY_CATEGORY_OPTIONS } = await import('../../mocks/beneficiary-values');
  return {
    getActiveBeneficiaryCategories: async () => [
      ...BENEFICIARY_CATEGORY_OPTIONS,
      ...extraCategories,
    ],
  };
});

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`Redirect: ${url}`);
  },
}));

const USER = {
  id: 1,
  role: 'admin',
  status: 'active',
  deletedAt: null,
};

const PROJECT = {
  id: 12,
  name: 'El Resorte',
  status: 'active',
  intensity: 'high',
  startYear: 2024,
  endYear: null,
  leadCoordinatorId: 2,
  generalObjective: 'Support children and families',
  publicDescription: 'Community project',
  coverPhoto: '/images/project-placeholders/2.webp',
  zone: 'city',
  localityNeighborhood: 'Casavalle',
  leadCoordinator: {
    id: 2,
    firstName: 'Ana',
    lastName: 'Garcia',
  },
  department: {
    id: 1,
    name: 'Montevideo',
  },
  topic: null,
  projectBeneficiaries: [{ year: 2026 }, { year: 2025 }],
};

function createCounts(overrides: Partial<BeneficiaryCounts> = {}): BeneficiaryCounts {
  return {
    directChildrenAdolescents: 0,
    indirectChildrenAdolescents: 0,
    youth18To29: 0,
    families: 0,
    coordinatedInstitutions: 0,
    communityLeaders: 0,
    basicServiceStaff: 0,
    ...overrides,
  };
}

const CURRENT = createCounts({
  directChildrenAdolescents: 100,
  indirectChildrenAdolescents: 20,
  communityLeaders: 10,
  families: 25,
  coordinatedInstitutions: 5,
});

const PREVIOUS = createCounts({
  directChildrenAdolescents: 90,
  indirectChildrenAdolescents: 10,
  families: 20,
  coordinatedInstitutions: 5,
});

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-09-28T12:00:00Z'));

  authMock.mockReset();
  authMock.mockResolvedValue({ user: { id: '1' } });

  prismaMock.user.findUnique.mockResolvedValue({ ...USER });
  prismaMock.project.findFirst.mockResolvedValue({ ...PROJECT });
  prismaMock.project.count.mockResolvedValue(10);

  prismaMock.projectBeneficiary.findUnique.mockImplementation(async ({ where }) => {
    const year = where.projectId_year.year;

    if (year === 2026) return { values: beneficiaryValueRows(CURRENT) };
    if (year === 2025) return { values: beneficiaryValueRows(PREVIOUS) };

    return null;
  });

  prismaMock.projectBeneficiaryValue.aggregate.mockResolvedValue({ _sum: { value: 1000 } });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('getProjectDetail', () => {
  it('returns metrics and institutional contribution', async () => {
    const result = await getProjectDetail('12', '2026');

    expect(result.status).toBe('success');
    if (result.status !== 'success') {
      throw new Error('Expected success');
    }

    expect(result.data).toMatchObject({
      project: { coverPhoto: '/images/project-placeholders/2.webp', endYear: null },
      selectedYear: 2026,
      comparisonYear: 2025,
      availableYears: [2026, 2025],
      hasData: true,
      hasHistoricalData: true,
      canEdit: true,
      metrics: {
        childrenReached: {
          value: 120,
          previousValue: 100,
          absoluteChange: 20,
          percentageChange: 20,
        },
        families: {
          value: 25,
          percentageChange: 25,
        },
        institutions: {
          value: 5,
          trend: 'stable',
        },
      },
      institutionalContribution: {
        nationalReach: {
          projectValue: 120,
          nationalValue: 1000,
          percentage: 12,
        },
        activeProjects: {
          projectCount: 1,
          totalCount: 10,
        },
        territories: {
          count: 1,
          items: [{ department: { id: 1, name: 'Montevideo' } }],
        },
      },
    });

    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({ coverPhoto: true, endYear: true }),
      })
    );
    expect(result.data.distribution).toHaveLength(7);
    expect(result.data.metrics.annualGrowth).toBeCloseTo(30);
    expect(result.data.distribution).toContainEqual({
      key: 'directChildrenAdolescents',
      label: 'NNA directos',
      value: 100,
    });
  });

  it('does not count a inactive project with beneficiary data as active', async () => {
    prismaMock.project.findFirst.mockResolvedValue({ ...PROJECT, status: 'inactive' });

    expect(await getProjectDetail('12', '2026')).toMatchObject({
      status: 'success',
      data: {
        hasData: true,
        institutionalContribution: {
          activeProjects: { projectCount: 0, totalCount: 10 },
        },
      },
    });
  });

  it('shows zero for a custom category without a stored value in a recorded year', async () => {
    extraCategories.push({ key: 'customTeachers', name: 'Docentes' });
    try {
      const result = await getProjectDetail('12', '2026');
      if (result.status !== 'success') {
        throw new Error('Expected success');
      }

      expect(result.data.distribution).toContainEqual({
        key: 'customTeachers',
        label: 'Docentes',
        value: 0,
      });
    } finally {
      extraCategories.length = 0;
    }
  });

  it('counts an active project without beneficiary records', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      ...PROJECT,
      projectBeneficiaries: [],
    });
    prismaMock.projectBeneficiary.findUnique.mockResolvedValue(null);

    expect(await getProjectDetail('12')).toMatchObject({
      status: 'success',
      data: {
        hasData: false,
        hasHistoricalData: false,
        institutionalContribution: {
          activeProjects: { projectCount: 1, totalCount: 10 },
        },
      },
    });
  });

  it('keeps current active project counts when the selected year changes', async () => {
    for (const year of ['2024', '2025', '2026']) {
      expect(await getProjectDetail('12', year)).toMatchObject({
        status: 'success',
        data: {
          institutionalContribution: {
            activeProjects: { projectCount: 1, totalCount: 10 },
          },
        },
      });
    }

    expect(prismaMock.project.count.mock.calls).toEqual([
      [{ where: { status: 'active', deletedAt: null } }],
      [{ where: { status: 'active', deletedAt: null } }],
      [{ where: { status: 'active', deletedAt: null } }],
    ]);
  });

  it('returns zero active projects when all projects are inactive', async () => {
    prismaMock.project.findFirst.mockResolvedValue({ ...PROJECT, status: 'inactive' });
    prismaMock.project.count.mockResolvedValue(0);

    expect(await getProjectDetail('12', '2026')).toMatchObject({
      status: 'success',
      data: {
        institutionalContribution: {
          activeProjects: { projectCount: 0, totalCount: 0 },
        },
      },
    });
  });

  it('uses the latest recorded year when omitted', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      ...PROJECT,
      projectBeneficiaries: [{ year: 2025 }],
    });

    expect(await getProjectDetail('12')).toMatchObject({
      status: 'success',
      data: {
        selectedYear: 2025,
        comparisonYear: 2024,
        availableYears: [2026, 2025],
        metrics: {
          childrenReached: {
            value: 100,
            previousValue: null,
          },
        },
      },
    });
  });

  it('offers a requested year without data in the year options', async () => {
    const result = await getProjectDetail('12', '2015');

    expect(result).toMatchObject({
      status: 'success',
      data: {
        selectedYear: 2015,
        hasData: false,
        availableYears: [2026, 2025, 2015],
      },
    });
  });

  it('uses the exact requested year for national totals', async () => {
    await getProjectDetail('12', '2025');

    expect(prismaMock.projectBeneficiaryValue.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          beneficiary: { year: 2025, project: { deletedAt: null } },
        }),
      })
    );
  });

  it('does not replace the previous year with an older record', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      ...PROJECT,
      projectBeneficiaries: [{ year: 2026 }, { year: 2024 }],
    });

    prismaMock.projectBeneficiary.findUnique.mockImplementation(async ({ where }) => {
      const year = where.projectId_year.year;

      if (year === 2026) return { values: beneficiaryValueRows(CURRENT) };
      if (year === 2024) return { values: beneficiaryValueRows(PREVIOUS) };

      return null;
    });

    expect(await getProjectDetail('12', '2026')).toMatchObject({
      status: 'success',
      data: {
        metrics: {
          childrenReached: {
            previousValue: null,
            absoluteChange: null,
          },
          annualGrowth: null,
        },
      },
    });
  });

  it('keeps a missing selected year instead of substituting data', async () => {
    const result = await getProjectDetail('12', '2024');

    expect(result).toMatchObject({
      status: 'success',
      data: {
        selectedYear: 2024,
        hasData: false,
        metrics: {
          childrenReached: { value: null },
          annualGrowth: null,
        },
        institutionalContribution: {
          activeProjects: { projectCount: 1, totalCount: 10 },
        },
      },
    });

    if (result.status !== 'success') {
      throw new Error('Expected success');
    }

    expect(result.data.distribution.every(({ value }) => value === null)).toBe(true);
  });

  it('uses the current year for a project without records', async () => {
    prismaMock.project.findFirst.mockResolvedValue({
      ...PROJECT,
      projectBeneficiaries: [],
    });
    prismaMock.projectBeneficiary.findUnique.mockResolvedValue(null);

    expect(await getProjectDetail('12')).toMatchObject({
      status: 'success',
      data: {
        selectedYear: 2026,
        availableYears: [2026],
        hasData: false,
        hasHistoricalData: false,
      },
    });
  });

  it('preserves a recorded year containing zeros', async () => {
    prismaMock.projectBeneficiary.findUnique.mockResolvedValue({
      values: beneficiaryValueRows(createCounts()),
    });
    prismaMock.projectBeneficiaryValue.aggregate.mockResolvedValue({ _sum: { value: 0 } });

    expect(await getProjectDetail('12', '2026')).toMatchObject({
      status: 'success',
      data: {
        hasData: true,
        metrics: {
          childrenReached: {
            value: 0,
            absoluteChange: 0,
            percentageChange: null,
            trend: 'stable',
          },
        },
        institutionalContribution: {
          nationalReach: { nationalValue: 0, percentage: null },
          activeProjects: { projectCount: 1 },
        },
      },
    });
  });

  it('handles a year without national records', async () => {
    prismaMock.projectBeneficiary.findUnique.mockResolvedValue(null);
    prismaMock.projectBeneficiaryValue.aggregate.mockResolvedValue({ _sum: { value: null } });

    expect(await getProjectDetail('12', '2024')).toMatchObject({
      status: 'success',
      data: {
        institutionalContribution: {
          nationalReach: {
            projectValue: null,
            nationalValue: 0,
            percentage: null,
          },
          activeProjects: { projectCount: 1, totalCount: 10 },
        },
      },
    });
  });

  it('returns notFound for a missing project', async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);

    expect(await getProjectDetail('12')).toEqual({ status: 'notFound' });
    expect(prismaMock.projectBeneficiaryValue.aggregate).not.toHaveBeenCalled();
  });

  it('returns notFound for a deleted project without querying metrics', async () => {
    prismaMock.project.findFirst.mockResolvedValue(null);

    expect(await getProjectDetail('12')).toEqual({ status: 'notFound' });
    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 12, deletedAt: null } })
    );
    expect(prismaMock.projectBeneficiary.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.projectBeneficiaryValue.aggregate).not.toHaveBeenCalled();
    expect(prismaMock.project.count).not.toHaveBeenCalled();
  });

  it('rejects invalid input before querying projects', async () => {
    expect(await getProjectDetail('abc', '2026')).toEqual({
      status: 'invalidInput',
      field: 'projectId',
    });
    expect(await getProjectDetail('12', '2027')).toEqual({
      status: 'invalidInput',
      field: 'year',
    });
    expect(prismaMock.project.findFirst).not.toHaveBeenCalled();
  });

  it('redirects unauthenticated users', async () => {
    authMock.mockResolvedValue(null);

    await expect(getProjectDetail('12')).rejects.toThrow('Redirect: /login');
    expect(prismaMock.project.findFirst).not.toHaveBeenCalled();
  });

  it.each(['disabled', 'pendingInvitation'])('rejects a user with status %s', async (status) => {
    prismaMock.user.findUnique.mockResolvedValue({ ...USER, status });

    await expect(getProjectDetail('12')).rejects.toThrow('Redirect: /login');
    expect(prismaMock.project.findFirst).not.toHaveBeenCalled();
  });

  it('rejects a deleted user', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      ...USER,
      deletedAt: new Date(),
    });

    await expect(getProjectDetail('12')).rejects.toThrow('Redirect: /login');
  });

  it('rejects a user that no longer exists', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(getProjectDetail('12')).rejects.toThrow('Redirect: /login');
  });

  it.each([
    { id: 2, canEdit: true },
    { id: 3, canEdit: false },
  ])('allows coordinator $id to read with canEdit=$canEdit', async ({ id, canEdit }) => {
    authMock.mockResolvedValue({ user: { id: String(id) } });
    prismaMock.user.findUnique.mockResolvedValue({ ...USER, id, role: 'coordinator' });

    expect(await getProjectDetail('12')).toMatchObject({
      status: 'success',
      data: { canEdit },
    });
  });

  it('selects only the coordinator fields needed by the view', async () => {
    await getProjectDetail('12');

    expect(prismaMock.project.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          leadCoordinator: {
            select: { id: true, firstName: true, lastName: true },
          },
        }),
      })
    );
  });

  it('propagates unexpected database errors', async () => {
    prismaMock.project.findFirst.mockRejectedValue(new Error('Database unavailable'));

    await expect(getProjectDetail('12')).rejects.toThrow('Database unavailable');
  });
});
