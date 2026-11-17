import { beforeEach, expect, it, vi } from 'vitest';
import { listProjectCovers } from '@/app/actions/project-covers';
import { prismaMock } from '../../mocks/prisma';

vi.mock('@/auth', () => ({
  auth: vi.fn().mockResolvedValue({ user: { id: '7' } }),
}));

const FIRST = '/uploads/covers/11111111-1111-4111-8111-111111111111.webp';
const SECOND = '/uploads/covers/22222222-2222-4222-8222-222222222222.webp';

beforeEach(() => {
  prismaMock.user.findUnique.mockResolvedValue({
    id: 7,
    role: 'admin',
    status: 'active',
    deletedAt: null,
  });
});

it('lists each uploaded cover in use once, newest first', async () => {
  prismaMock.project.findMany.mockResolvedValue([
    { coverPhoto: FIRST, name: 'Comedor' },
    { coverPhoto: FIRST, name: 'Otro' },
    { coverPhoto: '/images/project-placeholders/1.webp', name: 'Placeholder' },
    { coverPhoto: 'https://invalid.test/photo.webp', name: 'Externo' },
    { coverPhoto: SECOND, name: 'Huerta' },
  ]);

  expect(await listProjectCovers()).toEqual([
    { path: FIRST, projectName: 'Comedor', usedBy: 2 },
    { path: SECOND, projectName: 'Huerta', usedBy: 1 },
  ]);
  expect(prismaMock.project.findMany).toHaveBeenCalledWith({
    where: {
      deletedAt: null,
      coverPhoto: { startsWith: '/uploads/covers/' },
    },
    select: { coverPhoto: true, name: true },
    orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
  });
});
