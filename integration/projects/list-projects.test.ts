import { afterEach, beforeAll, describe, expect, test } from 'vitest';
import prisma from '@/lib/prisma';
import { listProjects } from '@/lib/projects/list';
import { parseProjectFilters } from '@/lib/validation/project-filters';
import { loadSeedData, type SeedData } from '../fixtures';
import { deleteProject } from './project-helpers';

let seed: SeedData;
let createdProjectIds: number[] = [];

async function createProjectFixture(name: string) {
  const project = await prisma.project.create({
    data: {
      name,
      status: 'active',
      intensity: 'high',
      counterpartyType: 'publicSector',
      startYear: 2020,
      leadCoordinatorId: seed.coordinatorId,
      departmentId: seed.departmentIds[0],
      zone: 'rural',
      createdBy: seed.adminId,
      topicId: seed.topicIds[0],
    },
  });
  createdProjectIds.push(project.id);
  return project.id;
}

async function searchProjectIds(search: string) {
  const { items } = await listProjects(parseProjectFilters({ search }));
  return items.map((project) => project.id);
}

beforeAll(async () => {
  seed = await loadSeedData();
});

afterEach(async () => {
  const ids = createdProjectIds;
  createdProjectIds = [];
  for (const id of ids) await deleteProject(id);
});

describe('listProjects search (integration)', () => {
  test.each(['onas', 'ONAS', 'Oñás', 'oñas', 'ÓÑÁS', 'Huerta Oñás'])(
    'finds "Huerta Oñás" when searching "%s"',
    async (search) => {
      const projectId = await createProjectFixture('Huerta Oñás');

      expect(await searchProjectIds(search)).toEqual([projectId]);
    }
  );

  test('finds an unaccented name when the search has accents', async () => {
    const projectId = await createProjectFixture('Educacion y Ninez');

    expect(await searchProjectIds('Educación y Niñez')).toEqual([projectId]);
  });

  test('matches accented vowels and ñ anywhere in the name', async () => {
    const projectId = await createProjectFixture('Árbol Ünico Íntimo Éxito Ñandú');

    expect(await searchProjectIds('arbol unico intimo exito nandu')).toEqual([projectId]);
  });

  test('treats LIKE wildcards in the search as plain text', async () => {
    await createProjectFixture('Huerta comunitaria');
    const projectId = await createProjectFixture('Huerta 100%');

    expect(await searchProjectIds('%')).toEqual([projectId]);
    expect(await searchProjectIds('_')).toEqual([]);
  });

  test('returns no projects when nothing matches', async () => {
    await createProjectFixture('Huerta Oñás');

    expect(await searchProjectIds('zzz sin coincidencias')).toEqual([]);
  });

  test('excludes deleted projects from the search', async () => {
    const projectId = await createProjectFixture('Huerta Oñás');
    await prisma.project.update({ where: { id: projectId }, data: { deletedAt: new Date() } });

    expect(await searchProjectIds('onas')).toEqual([]);
  });
});
