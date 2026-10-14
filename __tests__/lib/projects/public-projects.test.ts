import { describe, expect, test } from 'vitest';
import { prismaMock } from '../../mocks/prisma';
import {
  PUBLIC_PROJECTS_PAGE_SIZE,
  getPublicProjectsPage,
  getPublicTopics,
} from '@/lib/projects/public-projects';

const TOPIC_ID = 2;

function row(id: number) {
  return {
    id,
    name: `Proyecto ${id}`,
    publicDescription: null,
    coverPhoto: '/images/project-placeholders/1.webp',
    department: { name: 'Montevideo' },
    projectBeneficiaries: [{ values: [{ value: 10 }, { value: 5 }] }],
  };
}

function rows(count: number) {
  return Array.from({ length: count }, (_, index) => row(index + 1));
}

describe('getPublicTopics', () => {
  test('excludes disabled topics and topics without visible projects', async () => {
    prismaMock.topic.findMany.mockResolvedValue([]);
    expect(await getPublicTopics(2025)).toEqual([]);
    expect(prismaMock.topic.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          showPublicly: true,
          projects: {
            some: {
              deletedAt: null,
              showOnLanding: true,
              projectBeneficiaries: { some: { year: 2025 } },
            },
          },
        }),
      })
    );
  });
  test('maps each topic to its total and first page of public projects', async () => {
    prismaMock.topic.findMany.mockResolvedValue([
      { id: 1, name: 'Education', _count: { projects: 20 }, projects: rows(12) },
      { id: 3, name: 'Health', _count: { projects: 1 }, projects: [row(30)] },
    ]);

    const topics = await getPublicTopics(2025);

    expect(topics).toHaveLength(2);
    expect(topics[0]).toMatchObject({
      id: 1,
      name: 'Education',
      total: 20,
      initialPage: { page: 1, hasMore: true },
    });
    expect(topics[0].initialPage.items).toHaveLength(12);
    expect(topics[1]).toMatchObject({
      total: 1,
      initialPage: {
        items: [
          {
            id: 30,
            name: 'Proyecto 30',
            department: 'Montevideo',
            description: '',
            coverPhoto: '/images/project-placeholders/1.webp',
            reach: 15,
          },
        ],
        hasMore: false,
      },
    });
  });

  test('only loads active topics with public projects for the year', async () => {
    prismaMock.topic.findMany.mockResolvedValue([]);

    await getPublicTopics(2025);

    const where = {
      deletedAt: null,
      showOnLanding: true,
      projectBeneficiaries: { some: { year: 2025 } },
    };
    expect(prismaMock.topic.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { showPublicly: true, isActive: true, projects: { some: where } },
        select: expect.objectContaining({
          _count: { select: { projects: { where } } },
          projects: expect.objectContaining({ where, take: PUBLIC_PROJECTS_PAGE_SIZE }),
        }),
      })
    );
  });
});

describe('getPublicProjectsPage', () => {
  test('returns no cards for a disabled topic even when pagination is requested directly', async () => {
    prismaMock.project.findMany.mockResolvedValue([]);
    expect(await getPublicProjectsPage(2025, TOPIC_ID, 2)).toEqual({
      items: [],
      page: 2,
      hasMore: false,
    });
    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ topic: { isActive: true, showPublicly: true } }),
      })
    );
  });
  test('fetches one extra row to know whether more pages exist', async () => {
    prismaMock.project.findMany.mockResolvedValue(rows(PUBLIC_PROJECTS_PAGE_SIZE + 1));

    const result = await getPublicProjectsPage(2025, TOPIC_ID, 2);

    expect(result.items).toHaveLength(PUBLIC_PROJECTS_PAGE_SIZE);
    expect(result).toMatchObject({ page: 2, hasMore: true });
    expect(prismaMock.project.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          deletedAt: null,
          showOnLanding: true,
          projectBeneficiaries: { some: { year: 2025 } },
          topicId: TOPIC_ID,
          topic: { isActive: true, showPublicly: true },
        },
        skip: PUBLIC_PROJECTS_PAGE_SIZE,
        take: PUBLIC_PROJECTS_PAGE_SIZE + 1,
      })
    );
    expect(prismaMock.project.count).not.toHaveBeenCalled();
  });

  test('reports no more pages on the last page', async () => {
    prismaMock.project.findMany.mockResolvedValue(rows(3));

    const result = await getPublicProjectsPage(2025, TOPIC_ID, 3);

    expect(result.items).toHaveLength(3);
    expect(result.hasMore).toBe(false);
  });

  test('reports zero reach for a project without beneficiary values', async () => {
    prismaMock.project.findMany.mockResolvedValue([{ ...row(1), projectBeneficiaries: [] }]);

    const result = await getPublicProjectsPage(2025, TOPIC_ID, 1);

    expect(result.items[0].reach).toBe(0);
  });
});
