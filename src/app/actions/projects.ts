'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/auth/require-user';
import { canEditProject } from '@/lib/projects/permissions';
import { mapProjectDbError } from '@/lib/projects/map-project-db-error';
import { revalidateProject } from '@/lib/projects/revalidate-project';
import {
  getRandomProjectPlaceholder,
  isProjectPlaceholder,
} from '@/lib/projects/project-placeholders';
import { parseId } from '@/lib/validation/ids';
import { logAudit } from '@/lib/audit-log';
import { INTENSITY_REQUIRED_MESSAGE, type ProjectFormState } from '@/lib/validation/project';
import {
  buildProjectFormSchema,
  readProjectFormData,
  splitProjectFormData,
  TOPICS_ERROR_MESSAGE,
} from '@/lib/validation/project-form';
import type { Prisma } from '@/generated/prisma/client';
import type { Intensity } from '@/generated/prisma/enums';
import {
  DIRECT_CHILDREN_KEY,
  formCategoryValuesWhere,
  toBeneficiaryValuesCreate,
} from '@/lib/project-display';
import { getActiveBeneficiaryCategories } from '@/lib/beneficiary-categories';
import { BENEFICIARY_VALUES_SELECT, toBeneficiaryCounts } from '@/lib/projects/beneficiary-values';
import { DUPLICATE_PROJECT_MESSAGE } from '@/lib/projects/map-project-db-error';
import { PROJECT_LIST_PAGE_SIZE, parseProjectFilters } from '@/lib/validation/project-filters';
import { listProjects, type ProjectListPage } from '@/lib/projects/list';

async function lockTopics(tx: Prisma.TransactionClient, topicIds: number[]) {
  const ids = [...new Set(topicIds)].sort((a, b) => a - b);
  for (const id of ids) {
    await tx.$queryRaw`SELECT "id" FROM "Topic" WHERE "id" = ${id} FOR UPDATE`;
  }
}

async function validateRelations(
  tx: Prisma.TransactionClient,
  coordinatorId: number,
  topicIds: number[],
  currentCoordinatorId?: number,
  currentTopicIds: number[] = []
): Promise<ProjectFormState | null> {
  const coordinator = await tx.user.findFirst({
    where: {
      id: coordinatorId,
      ...(coordinatorId === currentCoordinatorId
        ? {}
        : { role: 'coordinator', status: 'active', deletedAt: null }),
    },
    select: { id: true },
  });
  if (!coordinator) return { errors: { leadCoordinatorId: ['Elegí un coordinador válido'] } };
  const validTopics = await tx.topic.count({
    where: {
      id: { in: topicIds },
      OR: [{ isActive: true }, { id: { in: currentTopicIds } }],
    },
  });

  if (validTopics !== topicIds.length) {
    return { errors: { topicIds: [TOPICS_ERROR_MESSAGE] } };
  }
  return null;
}

async function validateStrategicLines(
  tx: Prisma.TransactionClient,
  strategicLineIds: number[]
): Promise<ProjectFormState | null> {
  const validLines = await tx.$queryRaw<{ id: number }[]>`
    SELECT "id" FROM "StrategicLine"
    WHERE "id" = ANY(${strategicLineIds}) AND "isActive"
    ORDER BY "id"
    FOR SHARE
  `;

  if (validLines.length !== strategicLineIds.length) {
    return {
      errors: { strategicLineIds: ['Elegí líneas estratégicas activas'] },
    };
  }
  return null;
}

async function validateDepartments(
  tx: Prisma.TransactionClient,
  departmentIds: number[]
): Promise<ProjectFormState | null> {
  if (departmentIds.length === 0) return null;
  const count = await tx.department.count({ where: { id: { in: departmentIds } } });
  return count === departmentIds.length
    ? null
    : { errors: { departmentIds: ['Elegí departamentos válidos'] } };
}

async function validateUniqueName(
  tx: Prisma.TransactionClient,
  name: string,
  startYear: number,
  excludeId?: number
): Promise<ProjectFormState | null> {
  const duplicate = await tx.project.findFirst({
    where: {
      name: { equals: name, mode: 'insensitive' },
      startYear,
      deletedAt: null,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    select: { id: true },
  });
  return duplicate ? { errors: { name: [DUPLICATE_PROJECT_MESSAGE] } } : null;
}

async function hasDirectChildrenInOtherYears(
  tx: Prisma.TransactionClient,
  projectId: number,
  year: number
) {
  const value = await tx.projectBeneficiaryValue.findFirst({
    where: {
      beneficiary: { projectId, year: { not: year } },
      category: { key: DIRECT_CHILDREN_KEY },
      value: { gt: 0 },
    },
    select: { value: true },
  });
  return value !== null;
}

function resolveIntensity(
  intensity: Intensity | null,
  hasDirectChildren: boolean
): { intensity: Intensity | null } | { error: ProjectFormState } {
  if (!hasDirectChildren) return { intensity: null };
  if (!intensity) return { error: { errors: { intensity: [INTENSITY_REQUIRED_MESSAGE] } } };
  return { intensity };
}

const STALE_CATEGORIES_MESSAGE =
  'Las categorías de beneficiarios cambiaron. Recargá la página e intentá de nuevo.';

async function lockBeneficiaryCategories(tx: Prisma.TransactionClient, keys: string[]) {
  const active = await tx.$queryRaw<{ key: string }[]>`
    SELECT "key" FROM "BeneficiaryCategory"
    WHERE "key" = ANY(${keys}) AND "isActive"
    ORDER BY "id"
    FOR SHARE
  `;
  return active.length === keys.length;
}

async function parseProjectForm(formData: FormData) {
  const keys = (await getActiveBeneficiaryCategories()).map(({ key }) => key);
  const parsed = buildProjectFormSchema(keys).safeParse(readProjectFormData(formData));
  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors as Record<string, string[]> };
  }
  return { keys, ...splitProjectFormData(parsed.data, keys) };
}

function isSameValue(value: unknown, previous: unknown) {
  if (Array.isArray(value) && Array.isArray(previous)) {
    return (
      value.length === previous.length && value.every((item, index) => item === previous[index])
    );
  }
  return value === previous;
}

function hasSameIds(ids: number[], previousIds: number[]) {
  return ids.length === previousIds.length && ids.every((id) => previousIds.includes(id));
}

function changedFields<T extends object>(data: T, previous: T) {
  return (Object.keys(data) as (keyof T & string)[]).filter(
    (key) => !isSameValue(data[key], previous[key])
  );
}

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const user = await requireUser();
  if (user.role === 'coordinator') {
    formData.set('leadCoordinatorId', String(user.id));
  }
  const parsed = await parseProjectForm(formData);
  if ('errors' in parsed) return { errors: parsed.errors };
  const { keys, beneficiaryData } = parsed;
  const resolved = resolveIntensity(
    parsed.projectData.intensity,
    beneficiaryData.counts[DIRECT_CHILDREN_KEY] > 0
  );
  if ('error' in resolved) return resolved.error;
  const projectData = { ...parsed.projectData, intensity: resolved.intensity };
  const { topicIds, strategicLineIds, departmentIds } = parsed;
  const submittedPlaceholder = formData.get('projectPlaceholder');
  const coverPhoto = isProjectPlaceholder(submittedPlaceholder)
    ? submittedPlaceholder
    : getRandomProjectPlaceholder();
  let projectId: number;
  try {
    const result = await prisma.$transaction(
      async (tx): Promise<{ error: ProjectFormState } | { projectId: number }> => {
        await lockTopics(tx, topicIds);
        if (!(await lockBeneficiaryCategories(tx, keys))) {
          return { error: { formError: STALE_CATEGORIES_MESSAGE } };
        }
        const error = await validateRelations(tx, projectData.leadCoordinatorId, topicIds);
        if (error) return { error };
        const strategicLinesError = await validateStrategicLines(tx, strategicLineIds);
        if (strategicLinesError) return { error: strategicLinesError };
        const departmentsError = await validateDepartments(tx, departmentIds);
        if (departmentsError) return { error: departmentsError };
        const nameError = await validateUniqueName(tx, projectData.name, projectData.startYear);
        if (nameError) return { error: nameError };
        const project = await tx.project.create({
          data: {
            ...projectData,
            topics: { connect: topicIds.map((id) => ({ id })) },
            strategicLines: { connect: strategicLineIds.map((id) => ({ id })) },
            departments: { connect: departmentIds.map((id) => ({ id })) },
            coverPhoto,
            createdBy: user.id,
          },
        });
        await logAudit(tx, {
          authorId: user.id,
          action: 'creation',
          entity: 'project',
          entityId: project.id,
        });
        const beneficiary = await tx.projectBeneficiary.create({
          data: {
            year: beneficiaryData.year,
            projectId: project.id,
            authorId: user.id,
            values: { create: toBeneficiaryValuesCreate(beneficiaryData.counts) },
          },
        });
        await logAudit(tx, {
          authorId: user.id,
          action: 'creation',
          entity: 'beneficiary',
          entityId: beneficiary.id,
          details: {
            year: beneficiaryData.year,
            values: beneficiaryData.counts,
          },
        });
        return { projectId: project.id };
      },
      { maxWait: 10_000, timeout: 30_000 }
    );
    if ('error' in result) return result.error;
    projectId = result.projectId;
  } catch (error) {
    const mapped = mapProjectDbError(error);
    if (mapped) return mapped;
    console.error('Failed to create project', error);
    return { formError: 'No se pudo crear el proyecto. Intentá de nuevo.' };
  }
  revalidateProject();
  redirect(`/dashboard/projects/${projectId}`);
}

export async function updateProject(
  projectId: number,
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const user = await requireUser();
  if (!parseId(projectId)) return { formError: 'El proyecto no es válido.' };
  const parsed = await parseProjectForm(formData);
  if ('errors' in parsed) return { errors: parsed.errors };
  const { keys, projectData, beneficiaryData, topicIds, strategicLineIds, departmentIds } = parsed;
  try {
    const error = await prisma.$transaction(
      async (tx): Promise<ProjectFormState | null> => {
        await tx.$queryRaw`SELECT "id" FROM "Project" WHERE "id" = ${projectId} FOR UPDATE`;
        const previous = await tx.project.findFirst({
          where: { id: projectId, deletedAt: null },
          include: {
            topics: { select: { id: true } },
            strategicLines: { select: { id: true } },
            departments: { select: { id: true } },
          },
        });
        if (!previous) return { formError: 'El proyecto no existe o fue eliminado.' };
        if (!canEditProject(user, previous))
          return { formError: 'No tenés permiso para editar este proyecto.' };
        if (user.role !== 'admin' && projectData.leadCoordinatorId !== previous.leadCoordinatorId) {
          return {
            errors: {
              leadCoordinatorId: [
                'Solo un administrador puede cambiar el coordinador responsable.',
              ],
            },
          };
        }
        const currentTopicIds = previous.topics.map(({ id }) => id);
        const currentStrategicLineIds = previous.strategicLines.map(({ id }) => id);
        const strategicLinesError = await validateStrategicLines(tx, strategicLineIds);
        if (strategicLinesError) return strategicLinesError;
        const departmentsError = await validateDepartments(tx, departmentIds);
        if (departmentsError) return departmentsError;
        await lockTopics(tx, [...currentTopicIds, ...topicIds]);
        if (!(await lockBeneficiaryCategories(tx, keys))) {
          return { formError: STALE_CATEGORIES_MESSAGE };
        }
        const relationError = await validateRelations(
          tx,
          projectData.leadCoordinatorId,
          topicIds,
          previous.leadCoordinatorId,
          currentTopicIds
        );
        if (relationError) return relationError;
        const nameError = await validateUniqueName(
          tx,
          projectData.name,
          projectData.startYear,
          projectId
        );
        if (nameError) return nameError;
        if (projectData.status === 'inactive' && projectData.endYear !== null) {
          const laterBeneficiary = await tx.projectBeneficiary.findFirst({
            where: { projectId, year: { gt: projectData.endYear } },
            orderBy: { year: 'desc' },
            select: { year: true },
          });
          if (laterBeneficiary) {
            return {
              errors: {
                endYear: [
                  `El año de fin no puede ser anterior a ${laterBeneficiary.year}, que tiene beneficiarios registrados`,
                ],
              },
            };
          }
        }
        const resolved = resolveIntensity(
          projectData.intensity,
          beneficiaryData.counts[DIRECT_CHILDREN_KEY] > 0 ||
            (await hasDirectChildrenInOtherYears(tx, projectId, beneficiaryData.year))
        );
        if ('error' in resolved) return resolved.error;
        const nextProjectData = { ...projectData, intensity: resolved.intensity };
        const topicsChanged = !hasSameIds(topicIds, currentTopicIds);
        const strategicLinesChanged = !hasSameIds(strategicLineIds, currentStrategicLineIds);
        const departmentsChanged = !hasSameIds(
          departmentIds,
          previous.departments.map(({ id }) => id)
        );
        const fields = [
          ...changedFields(nextProjectData, previous),
          ...(topicsChanged ? ['topics'] : []),
          ...(strategicLinesChanged ? ['strategicLines'] : []),
          ...(departmentsChanged ? ['departments'] : []),
        ];
        if (fields.length) {
          await tx.project.update({
            where: { id: projectId },
            data: {
              ...nextProjectData,
              ...(topicsChanged ? { topics: { set: topicIds.map((id) => ({ id })) } } : {}),
              ...(strategicLinesChanged
                ? { strategicLines: { set: strategicLineIds.map((id) => ({ id })) } }
                : {}),
              ...(departmentsChanged
                ? { departments: { set: departmentIds.map((id) => ({ id })) } }
                : {}),
            },
          });
          await logAudit(tx, {
            authorId: user.id,
            action: 'update',
            entity: 'project',
            entityId: projectId,
            details: { changedFields: fields },
          });
        }
        const where = { projectId_year: { projectId, year: beneficiaryData.year } };
        const existing = await tx.projectBeneficiary.findUnique({
          where,
          select: BENEFICIARY_VALUES_SELECT,
        });
        const previousCounts = existing && toBeneficiaryCounts(existing.values);
        const changes = keys
          .map((key) => ({
            field: key,
            from: previousCounts?.[key] ?? 0,
            to: beneficiaryData.counts[key],
          }))
          .filter(({ from, to }) => from !== to);
        if (!existing || changes.length) {
          await tx.projectBeneficiaryValue.deleteMany({
            where: formCategoryValuesWhere(projectId, beneficiaryData.year, keys),
          });
          const beneficiary = await tx.projectBeneficiary.upsert({
            where,
            create: {
              year: beneficiaryData.year,
              projectId,
              authorId: user.id,
              values: { create: toBeneficiaryValuesCreate(beneficiaryData.counts) },
            },
            update: {
              authorId: user.id,
              recordedAt: new Date(),
              values: { create: toBeneficiaryValuesCreate(beneficiaryData.counts) },
            },
          });
          await logAudit(tx, {
            authorId: user.id,
            action: existing ? 'update' : 'creation',
            entity: 'beneficiary',
            entityId: beneficiary.id,
            details: { year: beneficiaryData.year, changes },
          });
        }
        return null;
      },
      { maxWait: 10_000, timeout: 30_000 }
    );
    if (error) return error;
  } catch (error) {
    const mapped = mapProjectDbError(error);
    if (mapped) return mapped;
    console.error('Failed to update project', error);
    return { formError: 'No se pudo actualizar el proyecto. Intentá de nuevo.' };
  }
  revalidateProject();
  redirect(`/dashboard/projects/${projectId}`);
}

export async function deleteProject(projectId: number): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!parseId(projectId)) return { error: 'El proyecto no es válido.' };
  try {
    const error = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: { id: projectId, deletedAt: null },
        select: { id: true, leadCoordinatorId: true },
      });
      if (!project) return 'El proyecto no existe o ya fue eliminado.';
      if (!canEditProject(user, project)) return 'No tenés permiso para eliminar este proyecto.';
      const { count } = await tx.project.updateMany({
        where: { id: projectId, deletedAt: null },
        data: { deletedAt: new Date(), deletedBy: user.id },
      });
      if (count === 0) return 'El proyecto no existe o ya fue eliminado.';
      await logAudit(tx, {
        authorId: user.id,
        action: 'deletion',
        entity: 'project',
        entityId: projectId,
      });
      return null;
    });
    if (error) return { error };
  } catch (error) {
    console.error('Failed to delete project', error);
    return { error: 'No se pudo eliminar el proyecto. Intentá de nuevo.' };
  }
  revalidateProject();
  return {};
}

export async function loadProjectsPage(
  filters: {
    status: string;
    beneficiaryYear: string;
    search?: string;
    departmentId?: string;
    topicId?: string;
  },
  page: number
): Promise<ProjectListPage> {
  await requireUser();

  return listProjects(
    parseProjectFilters({
      ...filters,
      page: String(page),
      pageSize: String(PROJECT_LIST_PAGE_SIZE),
    })
  );
}
