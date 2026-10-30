import { beforeEach, describe, expect, test, vi } from 'vitest';
import { getUserList, getUserStats, parseUserListFilters } from '@/lib/users/list';
import prisma from '@/lib/prisma';
import { makeUser } from '../fixtures/user';

beforeEach(() => {
  vi.mocked(prisma.user.findMany).mockResolvedValue([]);
});

describe('getUserList', () => {
  test('with no filters, excludes soft-deleted users and sorts by name', async () => {
    await getUserList();

    expect(prisma.user.findMany).toHaveBeenCalledWith({
      where: { deletedAt: null },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        status: true,
        lastAccess: true,
      },
      orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }, { id: 'asc' }],
    });
  });

  test('filters by role', async () => {
    await getUserList({ role: 'coordinator' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null, role: 'coordinator' },
      })
    );
  });

  test('filters by status, including disabled users', async () => {
    await getUserList({ status: 'disabled' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deletedAt: null, status: 'disabled' },
      })
    );
  });

  test('searches by name or email across firstName, lastName, and email', async () => {
    await getUserList({ search: 'ana' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          AND: [
            {
              OR: [
                { firstName: { contains: 'ana', mode: 'insensitive' } },
                { lastName: { contains: 'ana', mode: 'insensitive' } },
                { email: { contains: 'ana', mode: 'insensitive' } },
              ],
            },
          ],
        },
      })
    );
  });

  test('trims the search term before using it', async () => {
    await getUserList({ search: '  ana  ' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              OR: [
                { firstName: { contains: 'ana', mode: 'insensitive' } },
                { lastName: { contains: 'ana', mode: 'insensitive' } },
                { email: { contains: 'ana', mode: 'insensitive' } },
              ],
            },
          ],
        }),
      })
    );
  });

  test('matches first and last name together when the search has several words', async () => {
    await getUserList({ search: 'Ana García' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: [
            {
              OR: [
                { firstName: { contains: 'Ana', mode: 'insensitive' } },
                { lastName: { contains: 'Ana', mode: 'insensitive' } },
                { email: { contains: 'Ana', mode: 'insensitive' } },
              ],
            },
            {
              OR: [
                { firstName: { contains: 'García', mode: 'insensitive' } },
                { lastName: { contains: 'García', mode: 'insensitive' } },
                { email: { contains: 'García', mode: 'insensitive' } },
              ],
            },
          ],
        }),
      })
    );
  });

  test('ignores a search term that is only whitespace', async () => {
    await getUserList({ search: '   ' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { deletedAt: null } })
    );
  });

  test('combines search, role, and status filters', async () => {
    await getUserList({ search: 'ana', role: 'admin', status: 'active' });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          deletedAt: null,
          role: 'admin',
          status: 'active',
          AND: expect.any(Array),
        }),
      })
    );
  });

  test.each([
    ['role', [{ role: 'asc' }, { firstName: 'asc' }, { lastName: 'asc' }, { id: 'asc' }]],
    ['status', [{ status: 'asc' }, { firstName: 'asc' }, { lastName: 'asc' }, { id: 'asc' }]],
    [
      'lastAccess',
      [
        { lastAccess: { sort: 'desc', nulls: 'last' } },
        { firstName: 'asc' },
        { lastName: 'asc' },
        { id: 'asc' },
      ],
    ],
  ] as const)('sorts by %s when requested', async (sortBy, expectedOrderBy) => {
    await getUserList({ sortBy });

    expect(prisma.user.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: expectedOrderBy })
    );
  });

  test('returns an empty list when there are no matches', async () => {
    vi.mocked(prisma.user.findMany).mockResolvedValue([]);

    await expect(getUserList({ search: 'nadie' })).resolves.toEqual([]);
  });

  test('returns whatever prisma resolves', async () => {
    const users = [makeUser({ id: 1, firstName: 'Ana', lastName: 'Admin' })];
    vi.mocked(prisma.user.findMany).mockResolvedValue(users);

    await expect(getUserList()).resolves.toEqual(users);
  });
});

describe('parseUserListFilters', () => {
  test('maps url params to filters', () => {
    expect(
      parseUserListFilters({ q: 'ana', role: 'admin', status: 'active', sort: 'lastAccess' })
    ).toEqual({ search: 'ana', role: 'admin', status: 'active', sortBy: 'lastAccess' });
  });

  test('ignores invalid role and status', () => {
    expect(parseUserListFilters({ role: 'hola', status: 'nope' })).toEqual({
      search: undefined,
      role: undefined,
      status: undefined,
      sortBy: 'name',
    });
  });

  test('falls back to sorting by name when sort is not recognized', () => {
    expect(parseUserListFilters({ sort: 'xxx' }).sortBy).toBe('name');
  });

  test('ignores sort values inherited from the object prototype', () => {
    expect(parseUserListFilters({ sort: 'constructor' }).sortBy).toBe('name');
    expect(parseUserListFilters({ sort: 'toString' }).sortBy).toBe('name');
  });

  test('ignores a blank search', () => {
    expect(parseUserListFilters({ q: '   ' }).search).toBeUndefined();
    expect(parseUserListFilters({ q: ' ana ' }).search).toBe('ana');
  });

  test('takes the first value when a param is repeated', () => {
    expect(parseUserListFilters({ q: ['ana', 'juan'] }).search).toBe('ana');
  });
});

describe('getUserStats', () => {
  test('counts only non-deleted users', async () => {
    vi.mocked(prisma.user.count)
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(3)
      .mockResolvedValueOnce(7)
      .mockResolvedValueOnce(2);

    await expect(getUserStats()).resolves.toEqual({
      total: 10,
      admins: 3,
      coordinators: 7,
      pendingInvitations: 2,
    });

    expect(prisma.user.count).toHaveBeenCalledWith({ where: { deletedAt: null } });
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { deletedAt: null, role: 'admin' },
    });
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { deletedAt: null, role: 'coordinator' },
    });
    expect(prisma.user.count).toHaveBeenCalledWith({
      where: { deletedAt: null, status: 'pendingInvitation' },
    });
  });
});
