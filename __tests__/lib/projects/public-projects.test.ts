import { describe, expect, test } from 'vitest';
import { prismaMock } from '../../mocks/prisma';
import { PUBLIC_PROJECTS_PAGE_SIZE, getPublicProjectsPage } from '@/lib/projects/public-projects';
import { beneficiaryValueRows } from '../../mocks/beneficiary-values';

const TOPIC_ID = 2;

const ROW = {
  id: 1,
  name: 'Centro comunitario',
  publicDescription: null,
  coverPhoto: '/images/project-placeholders/1.webp',
  department: { id: 1, name: 'Montevideo' },
  projectBeneficiaries: [
    {
      year: 2025,
      values: beneficiaryValueRows({
        directChildrenAdolescents: 10,
        indirectChildrenAdolescents: 5,
        youth18To29: 0,
        families: 0,
        coordinatedInstitutions: 0,
        communityLeaders: 0,
        basicServiceStaff: 0,
      }),
    },
  ],
};

function mockProjects(total: number) {
  prismaMock.project.count.mockResolvedValue(total);
  prismaMock.project.findMany.mockResolvedValue([ROW] as never);
}

describe('getPublicProjectsPage', () => {
  test('maps rows to public projects and reports more pages', async () => {
    mockProjects(PUBLIC_PROJECTS_PAGE_SIZE * 2);

    const result = await getPublicProjectsPage(2025, '1', TOPIC_ID);

    expect(result).toEqual({
      items: [
        {
          id: 1,
          name: 'Centro comunitario',
          department: 'Montevideo',
          description: '',
          coverPhoto: '/images/project-placeholders/1.webp',
          reach: 15,
        },
      ],
      total: PUBLIC_PROJECTS_PAGE_SIZE * 2,
      page: 1,
      hasMore: true,
    });
  });

  test('filters projects by topic', async () => {
    mockProjects(1);

    await getPublicProjectsPage(2025, '1', TOPIC_ID);

    expect(prismaMock.project.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ topicId: TOPIC_ID }),
    });
  });

  test('reports no more pages on the last page', async () => {
    mockProjects(PUBLIC_PROJECTS_PAGE_SIZE * 2);

    const result = await getPublicProjectsPage(2025, '2', TOPIC_ID);

    expect(result).toMatchObject({ page: 2, hasMore: false });
  });

  test('returns no items when the page is past the end', async () => {
    mockProjects(PUBLIC_PROJECTS_PAGE_SIZE * 2);

    const result = await getPublicProjectsPage(2025, '9', TOPIC_ID);

    expect(result).toMatchObject({ items: [], hasMore: false });
  });

  test('falls back to the first page for an invalid page', async () => {
    mockProjects(PUBLIC_PROJECTS_PAGE_SIZE * 2);

    const result = await getPublicProjectsPage(2025, 'abc', TOPIC_ID);

    expect(result.page).toBe(1);
  });
});
