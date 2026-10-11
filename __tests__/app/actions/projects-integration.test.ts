import { afterAll, beforeAll, expect, it, vi } from 'vitest';
import { PrismaClient } from '@/generated/prisma/client';

const state = vi.hoisted(() => ({ authorId: 0, failAudit: false }));
vi.mock('@/lib/prisma', async () => {
  const { PrismaClient } = await import('@/generated/prisma/client');
  return { default: new PrismaClient({ datasourceUrl: process.env.PROJECT_TEST_DATABASE_URL }) };
});
vi.mock('@/auth', () => ({ auth: vi.fn(async () => ({ user: { id: String(state.authorId) } })) }));
vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    throw new Error(`Redirect: ${url}`);
  },
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('@/lib/audit-log', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/audit-log')>();
  return {
    logAudit: (...args: Parameters<typeof original.logAudit>) => {
      if (state.failAudit && args[1].entity === 'beneficiary') throw new Error('Audit unavailable');
      return original.logAudit(...args);
    },
  };
});

import prisma from '@/lib/prisma';
import { updateProject } from '@/app/actions/projects';

const WITH_VALUES = { values: { orderBy: { categoryId: 'asc' } } } as const;

const TEST_DATABASE_URL = process.env.PROJECT_TEST_DATABASE_URL;
const database = TEST_DATABASE_URL ? new PrismaClient({ datasourceUrl: TEST_DATABASE_URL }) : null;
let projectId = 0;
let coordinatorId = 0;
let departmentId = 0;
let topicId = 0;

beforeAll(async () => {
  if (!database) return;
  const suffix = crypto.randomUUID();
  const user = await database.user.create({
    data: {
      firstName: 'Review',
      lastName: 'Admin',
      email: `${suffix}@example.test`,
      documentId: suffix,
      role: 'admin',
      status: 'active',
      passwordHash: 'unused',
    },
  });
  state.authorId = user.id;
  const coordinator = await database.user.create({
    data: {
      firstName: 'Review',
      lastName: 'Coordinator',
      email: `coordinator-${suffix}@example.test`,
      documentId: `coordinator-${suffix}`,
      role: 'coordinator',
      status: 'active',
      passwordHash: 'unused',
    },
  });
  coordinatorId = coordinator.id;
  const department = await database.department.create({ data: { name: `Review ${suffix}` } });
  departmentId = department.id;
  const topic = await database.topic.create({ data: { name: `Review ${suffix}` } });
  topicId = topic.id;
  const project = await database.project.create({
    data: {
      name: 'Original project',
      topicId,
      status: 'active',
      intensity: 'high',
      counterpartyType: 'publicSector',
      startYear: 2024,
      leadCoordinatorId: coordinatorId,
      departmentId,
      zone: 'city',
      coverPhoto: '/existing-cover.png',
      createdBy: user.id,
    },
  });
  projectId = project.id;
  await database.projectBeneficiary.create({
    data: {
      projectId,
      year: 2025,
      authorId: user.id,
      values: { create: [{ value: 20, category: { connect: { key: 'families' } } }] },
    },
  });
});

afterAll(async () => {
  if (!database) return;
  await database.auditLog.deleteMany({ where: { authorId: state.authorId } });
  await database.projectBeneficiary.deleteMany({ where: { projectId } });
  if (projectId) await database.project.delete({ where: { id: projectId } });
  if (topicId) await database.topic.delete({ where: { id: topicId } });
  if (departmentId) await database.department.delete({ where: { id: departmentId } });
  await database.user.deleteMany({ where: { id: { in: [state.authorId, coordinatorId] } } });
  await database.$disconnect();
  await prisma.$disconnect();
});

it.skipIf(!TEST_DATABASE_URL)(
  'rolls back project, topic, beneficiaries and audit together, then persists a retry',
  async () => {
    const data = new FormData();
    Object.entries({
      name: 'Changed project',
      status: 'active',
      intensity: 'high',
      counterpartyType: 'publicSector',
      startYear: '2024',
      leadCoordinatorId: String(coordinatorId),
      departmentId: String(departmentId),
      zone: 'city',
      year: '2026',
      families: '35',
      topicId: String(topicId),
      coverPhoto: '/forged-cover.png',
    }).forEach(([key, value]) => data.append(key, value));
    const original = await database!.project.findUniqueOrThrow({ where: { id: projectId } });
    const historical = await database!.projectBeneficiary.findUniqueOrThrow({
      where: { projectId_year: { projectId, year: 2025 } },
      include: WITH_VALUES,
    });
    state.failAudit = true;
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      expect((await updateProject(projectId, {}, data)).formError).toBeDefined();
    } finally {
      errorSpy.mockRestore();
      state.failAudit = false;
    }
    expect(await database!.project.findUnique({ where: { id: projectId } })).toEqual(original);
    expect(await database!.projectBeneficiary.count({ where: { projectId } })).toBe(1);
    expect(await database!.auditLog.count({ where: { authorId: state.authorId } })).toBe(0);
    await expect(updateProject(projectId, {}, data)).rejects.toThrow(
      `Redirect: /dashboard/projects/${projectId}`
    );
    const saved = await database!.project.findUniqueOrThrow({
      where: { id: projectId },
    });
    expect(saved.name).toBe('Changed project');
    expect(saved.coverPhoto).toBe('/existing-cover.png');
    expect(saved.topicId).toBe(topicId);
    expect(
      await database!.projectBeneficiary.findUnique({
        where: { projectId_year: { projectId, year: 2025 } },
        include: WITH_VALUES,
      })
    ).toEqual(historical);
    expect(
      await database!.projectBeneficiary.findUnique({
        where: { projectId_year: { projectId, year: 2026 } },
        select: { values: { where: { category: { key: 'families' } }, select: { value: true } } },
      })
    ).toEqual({ values: [{ value: 35 }] });
    expect(await database!.auditLog.count({ where: { authorId: state.authorId } })).toBe(2);
    await expect(updateProject(projectId, {}, data)).rejects.toThrow('Redirect:');
    expect(await database!.project.findUnique({ where: { id: projectId } })).toMatchObject({
      updatedAt: saved.updatedAt,
    });
    expect(await database!.auditLog.count({ where: { authorId: state.authorId } })).toBe(2);
  }
);
