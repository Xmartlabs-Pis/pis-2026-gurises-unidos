import prisma from '@/lib/prisma';
import { STRATEGIC_LINES } from '../prisma/fixtures';
import {
  E2E_ADMIN,
  E2E_COORDINATOR,
  E2E_DEPARTMENT,
  E2E_DISABLED_COORDINATOR,
  E2E_SECONDARY_DEPARTMENT,
  E2E_TOPICS,
} from '../prisma/e2e-fixtures';

export type SeedData = {
  adminId: number;
  coordinatorId: number;
  disabledCoordinatorId: number;
  departmentIds: number[];
  topicIds: number[];
  strategicLineIds: number[];
};

async function userId(documentId: string) {
  const user = await prisma.user.findUniqueOrThrow({ where: { documentId } });
  return user.id;
}

async function departmentId(name: string) {
  const department = await prisma.department.findUniqueOrThrow({ where: { name } });
  return department.id;
}

async function topicIds() {
  const topics = await prisma.topic.findMany({ where: { name: { in: [...E2E_TOPICS] } } });
  return E2E_TOPICS.map((name) => {
    const topic = topics.find((candidate) => candidate.name === name);
    if (!topic) throw new Error(`Seeded topic "${name}" not found, run the e2e seed`);
    return topic.id;
  });
}

async function strategicLineIds() {
  const lines = await prisma.strategicLine.findMany({
    where: { name: { in: [...STRATEGIC_LINES] } },
  });
  return STRATEGIC_LINES.map((name) => {
    const line = lines.find((candidate) => candidate.name === name);
    if (!line) throw new Error(`Seeded strategic line "${name}" not found, run the e2e seed`);
    return line.id;
  });
}

export async function loadSeedData(): Promise<SeedData> {
  const [
    adminId,
    coordinatorId,
    disabledCoordinatorId,
    primaryDepartmentId,
    secondaryDepartmentId,
    strategicLines,
  ] = await Promise.all([
    userId(E2E_ADMIN.documentId),
    userId(E2E_COORDINATOR.documentId),
    userId(E2E_DISABLED_COORDINATOR.documentId),
    departmentId(E2E_DEPARTMENT),
    departmentId(E2E_SECONDARY_DEPARTMENT),
    strategicLineIds(),
  ]);
  return {
    adminId,
    coordinatorId,
    disabledCoordinatorId,
    departmentIds: [primaryDepartmentId, secondaryDepartmentId],
    topicIds: await topicIds(),
    strategicLineIds: strategicLines,
  };
}
