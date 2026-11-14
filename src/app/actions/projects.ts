'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ASSIGNABLE_LEAD_COORDINATOR_WHERE } from '@/lib/projects/constants';
import { requireUser } from '@/lib/auth/require-user';
import { canEditProject } from '@/lib/projects/permissions';
import { mapProjectDbError } from '@/lib/projects/map-project-db-error';
import { revalidateProject } from '@/lib/projects/revalidate-project';
import { coverPathFromForm, wantsCoverRemoved } from '@/lib/projects/cover-photo';
import {
  claimUploadedCover,
  discardOwnedUnusedCover,
  discardUnusedUploadedCover,
  ownedUploadedCoverPath,
  reusedCoverPath,
} from '@/lib/projects/pending-cover';
import { coverCropFromForm, sameCoverCrop, type CoverCrop } from '@/lib/projects/cover-crop';
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
  LOCATIONS_ERROR_MESSAGE,
  TOPICS_ERROR_MESSAGE,
} from '@/lib/validation/project-form';
import { Prisma } from '@/generated/prisma/client';
import type { Intensity, UserRole } from '@/generated/prisma/enums';
import {
  DIRECT_CHILDREN_KEY,
  formCategoryValuesWhere,
  toBeneficiaryValuesCreate,
} from '@/lib/project-display';
import { getActiveBeneficiaryCategories } from '@/lib/beneficiary-categories';
import { BENEFICIARY_VALUES_SELECT, toBeneficiaryCounts } from '@/lib/projects/beneficiary-values';
import { DUPLICATE_PROJECT_MESSAGE } from '@/lib/projects/map-project-db-error';
import { PROJECT_LIST_PAGE_SIZE, parseProjectFilters } from '@/lib/validation/project-filters';
import {
  listProjectDataYears,
  listProjects,
  type ProjectDataYear,
  type ProjectListPage,
} from '@/lib/projects/list';
import { getProjectAuditChanges, PROJECT_AUDIT_INCLUDE } from '@/lib/projects/audit-changes';
import type { ProjectLocality } from '@/lib/projects/location';

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
      ...(coordinatorId === currentCoordinatorId ? {} : ASSIGNABLE_LEAD_COORDINATOR_WHERE),
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

async function validatePartners(
  tx: Prisma.TransactionClient,
  partnerIds: number[],
  counterpartyTypes: string[]
): Promise<ProjectFormState | null> {
  if (partnerIds.length === 0) return null;
  const validPartners = await tx.$queryRaw<{ id: number }[]>`
    SELECT "id" FROM "Partner"
    WHERE "id" = ANY(${partnerIds})
      AND "isActive"
      AND "counterpartyType"::text = ANY(${counterpartyTypes})
    ORDER BY "id"
    FOR SHARE
  `;

  if (validPartners.length !== partnerIds.length) {
    return {
      errors: { partnerIds: ['Elegí socios activos de las contrapartes seleccionadas'] },
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
    : { errors: { locations: [LOCATIONS_ERROR_MESSAGE] } };
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
  years: number[]
) {
  const value = await tx.projectBeneficiaryValue.findFirst({
    where: {
      beneficiary: { projectId, year: { notIn: years } },
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

const UNAVAILABLE_COVER_MESSAGE =
  'La imagen de portada que elegiste ya no está disponible. Elegí otra.';

function submittedPlaceholder(formData: FormData) {
  const submitted = formData.get('projectPlaceholder');
  return isProjectPlaceholder(submitted) ? submitted : getRandomProjectPlaceholder();
}

async function requestedCoverPath(uploadedPath: string | null, formData: FormData, userId: number) {
  return (
    (await ownedUploadedCoverPath(uploadedPath, userId)) ??
    (await reusedCoverPath(uploadedPath)) ??
    (wantsCoverRemoved(formData) ? submittedPlaceholder(formData) : null)
  );
}

function nextCoverCrop(formData: FormData, coverChanged: boolean) {
  if (wantsCoverRemoved(formData)) return null;
  const submitted = coverCropFromForm(formData);
  if (coverChanged) return submitted ?? null;
  return submitted;
}

function coverCropInput(crop: CoverCrop | null) {
  return crop === null ? Prisma.DbNull : crop;
}

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

function localityKey({ departmentId, city, neighborhood }: ProjectLocality) {
  return JSON.stringify([departmentId, city, neighborhood ?? null]);
}

function hasSameLocalities(localities: ProjectLocality[], previousLocalities: ProjectLocality[]) {
  const previousKeys = new Set(previousLocalities.map(localityKey));
  return (
    localities.length === previousLocalities.length &&
    localities.every((locality) => previousKeys.has(localityKey(locality)))
  );
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
  const uploadedPath = coverPathFromForm(formData);
  const parsed = await parseProjectForm(formData);
  if ('errors' in parsed) {
    await discardOwnedUnusedCover(uploadedPath, user.id);
    return { errors: parsed.errors };
  }
  const { keys } = parsed;
  const beneficiaryYears = [parsed.beneficiaryData, ...parsed.beneficiaryDraftData];
  const resolved = resolveIntensity(
    parsed.projectData.intensity,
    hasDirectChildren(beneficiaryYears)
  );
  if ('error' in resolved) {
    await discardOwnedUnusedCover(uploadedPath, user.id);
    return resolved.error;
  }
  const projectData = { ...parsed.projectData, intensity: resolved.intensity };
  const { topicIds, strategicLineIds, partnerIds, departmentIds, localities } = parsed;
  let projectId: number;
  try {
    const requestedCover = await requestedCoverPath(uploadedPath, formData, user.id);
    if (uploadedPath !== null && requestedCover === null) {
      return { formError: UNAVAILABLE_COVER_MESSAGE };
    }
    const coverPhoto = requestedCover ?? submittedPlaceholder(formData);
    const coverCrop = wantsCoverRemoved(formData) ? null : (coverCropFromForm(formData) ?? null);
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
        const partnersError = await validatePartners(tx, partnerIds, projectData.counterpartyTypes);
        if (partnersError) return { error: partnersError };
        const departmentsError = await validateDepartments(tx, departmentIds);
        if (departmentsError) return { error: departmentsError };
        const nameError = await validateUniqueName(tx, projectData.name, projectData.startYear);
        if (nameError) return { error: nameError };
        const project = await tx.project.create({
          data: {
            ...projectData,
            topics: { connect: topicIds.map((id) => ({ id })) },
            strategicLines: { connect: strategicLineIds.map((id) => ({ id })) },
            partners: { connect: partnerIds.map((id) => ({ id })) },
            departments: { connect: departmentIds.map((id) => ({ id })) },
            localities: { create: localities },
            coverPhoto,
            coverCrop: coverCropInput(coverCrop),
            createdBy: user.id,
          },
        });
        await logAudit(tx, {
          authorId: user.id,
          action: 'creation',
          entity: 'project',
          entityId: project.id,
        });
        for (const { year, counts } of beneficiaryYears) {
          const beneficiary = await tx.projectBeneficiary.create({
            data: {
              year,
              projectId: project.id,
              authorId: user.id,
              values: { create: toBeneficiaryValuesCreate(counts) },
            },
          });
          await logAudit(tx, {
            authorId: user.id,
            action: 'creation',
            entity: 'beneficiary',
            entityId: beneficiary.id,
            details: { year, values: counts },
          });
        }
        return { projectId: project.id };
      },
      { maxWait: 10_000, timeout: 30_000 }
    );
    if ('error' in result) {
      await discardOwnedUnusedCover(uploadedPath, user.id);
      return result.error;
    }
    projectId = result.projectId;
    await claimUploadedCover(coverPhoto);
  } catch (error) {
    await discardOwnedUnusedCover(uploadedPath, user.id);
    const mapped = mapProjectDbError(error);
    if (mapped) return mapped;
    console.error('Failed to create project', error);
    return { formError: 'No se pudo crear el proyecto. Intentá de nuevo.' };
  }
  revalidateProject();
  redirect(`/dashboard/projects/${projectId}`);
}

type ParsedProjectForm = Exclude<Awaited<ReturnType<typeof parseProjectForm>>, { errors: unknown }>;
type ProjectData = ParsedProjectForm['projectData'];
type BeneficiaryYear = ParsedProjectForm['beneficiaryData'];
type EditableProject = NonNullable<Awaited<ReturnType<typeof lockProject>>>;
type ProjectUpdate = { fields: string[]; data: Prisma.ProjectUncheckedUpdateInput };

function hasDirectChildren(beneficiaryYears: BeneficiaryYear[]) {
  return beneficiaryYears.some(({ counts }) => counts[DIRECT_CHILDREN_KEY] > 0);
}

async function lockProject(tx: Prisma.TransactionClient, projectId: number) {
  await tx.$queryRaw`SELECT "id" FROM "Project" WHERE "id" = ${projectId} FOR UPDATE`;
  return tx.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: PROJECT_AUDIT_INCLUDE,
  });
}

function checkProjectEditable(
  user: { id: number; role: UserRole },
  previous: EditableProject,
  projectData: ProjectData
): ProjectFormState | null {
  if (!canEditProject(user, previous)) {
    return { formError: 'No tenés permiso para editar este proyecto.' };
  }
  if (user.role !== 'admin' && projectData.leadCoordinatorId !== previous.leadCoordinatorId) {
    return {
      errors: {
        leadCoordinatorId: ['Solo un administrador puede cambiar el coordinador responsable.'],
      },
    };
  }
  return null;
}

async function validateStartYear(
  tx: Prisma.TransactionClient,
  projectId: number,
  { projectData: { startYear }, beneficiaryData, beneficiaryDraftData, keys }: ParsedProjectForm
): Promise<ProjectFormState | null> {
  const clearedYears = [beneficiaryData, ...beneficiaryDraftData]
    .filter(({ counts }) => keys.every((key) => counts[key] === 0))
    .map(({ year }) => year);
  const earlierBeneficiary = await tx.projectBeneficiary.findFirst({
    where: {
      projectId,
      year: { lt: startYear, notIn: clearedYears },
      values: { some: { value: { gt: 0 } } },
    },
    orderBy: { year: 'asc' },
    select: { year: true },
  });
  if (!earlierBeneficiary) return null;
  return {
    errors: {
      startYear: [
        `El año de inicio no puede ser posterior a ${earlierBeneficiary.year}, porque tiene beneficiarios registrados`,
      ],
    },
  };
}

async function validateEndYear(
  tx: Prisma.TransactionClient,
  projectId: number,
  {
    projectData: { status, endYear },
    beneficiaryData,
    beneficiaryDraftData,
    keys,
  }: ParsedProjectForm
): Promise<ProjectFormState | null> {
  if (status !== 'inactive' || endYear === null) return null;
  const clearedYears = [beneficiaryData, ...beneficiaryDraftData]
    .filter(({ counts }) => keys.every((key) => counts[key] === 0))
    .map(({ year }) => year);
  const laterBeneficiary = await tx.projectBeneficiary.findFirst({
    where: {
      projectId,
      year: { gt: endYear, notIn: clearedYears },
      values: { some: { value: { gt: 0 } } },
    },
    orderBy: { year: 'desc' },
    select: { year: true },
  });
  if (!laterBeneficiary) return null;
  return {
    errors: {
      endYear: [
        `El año de fin no puede ser anterior a ${laterBeneficiary.year}, que tiene beneficiarios registrados`,
      ],
    },
  };
}

async function validateProjectUpdate(
  tx: Prisma.TransactionClient,
  previous: EditableProject,
  parsed: ParsedProjectForm
): Promise<ProjectFormState | null> {
  const { keys, projectData, topicIds, strategicLineIds, partnerIds, departmentIds } = parsed;
  const currentTopicIds = previous.topics.map(({ id }) => id);
  const strategicLinesError = await validateStrategicLines(tx, strategicLineIds);
  if (strategicLinesError) return strategicLinesError;
  const partnersError = await validatePartners(tx, partnerIds, projectData.counterpartyTypes);
  if (partnersError) return partnersError;
  const departmentsError = await validateDepartments(tx, departmentIds);
  if (departmentsError) return departmentsError;
  await lockTopics(tx, [...currentTopicIds, ...topicIds]);
  if (!(await lockBeneficiaryCategories(tx, keys))) {
    return { formError: STALE_CATEGORIES_MESSAGE };
  }
  return (
    (await validateRelations(
      tx,
      projectData.leadCoordinatorId,
      topicIds,
      previous.leadCoordinatorId,
      currentTopicIds
    )) ??
    (await validateUniqueName(tx, projectData.name, projectData.startYear, previous.id)) ??
    (await validateEndYear(tx, previous.id, parsed)) ??
    (await validateStartYear(tx, previous.id, parsed))
  );
}

function buildCoverUpdates(
  previous: EditableProject,
  requestedCover: string | null,
  formData: FormData
): ProjectUpdate {
  const update: ProjectUpdate = { fields: [], data: {} };
  const coverChanged = requestedCover !== null && requestedCover !== previous.coverPhoto;
  if (coverChanged) {
    update.fields.push('coverPhoto');
    update.data.coverPhoto = requestedCover;
  }
  const nextCrop = nextCoverCrop(formData, coverChanged);
  if (nextCrop !== undefined && !sameCoverCrop(nextCrop, previous.coverCrop)) {
    update.fields.push('coverCrop');
    update.data.coverCrop = coverCropInput(nextCrop);
  }
  return update;
}

function relationSet(ids: number[], previous: { id: number }[]) {
  const previousIds = previous.map(({ id }) => id);
  return hasSameIds(ids, previousIds) ? undefined : { set: ids.map((id) => ({ id })) };
}

function buildRelationUpdates(
  previous: EditableProject,
  {
    topicIds,
    strategicLineIds,
    partnerIds,
    departmentIds,
    localities,
  }: Pick<
    ParsedProjectForm,
    'topicIds' | 'strategicLineIds' | 'partnerIds' | 'departmentIds' | 'localities'
  >
): ProjectUpdate {
  const changes = Object.entries({
    topics: relationSet(topicIds, previous.topics),
    strategicLines: relationSet(strategicLineIds, previous.strategicLines),
    partners: relationSet(partnerIds, previous.partners),
    departments: relationSet(departmentIds, previous.departments),
    localities: hasSameLocalities(localities, previous.localities)
      ? undefined
      : { deleteMany: {}, create: localities },
  }).filter(([, value]) => value !== undefined);
  return { fields: changes.map(([key]) => key), data: Object.fromEntries(changes) };
}

async function saveProjectChanges(
  tx: Prisma.TransactionClient,
  authorId: number,
  previous: EditableProject,
  { fields, data }: ProjectUpdate
) {
  if (!fields.length) return;
  const updated = await tx.project.update({
    where: { id: previous.id },
    data,
    include: PROJECT_AUDIT_INCLUDE,
  });
  await logAudit(tx, {
    authorId,
    action: 'update',
    entity: 'project',
    entityId: previous.id,
    details: {
      changedFields: fields,
      changes: getProjectAuditChanges(previous, updated, fields),
    },
  });
}

async function updateBeneficiaries(
  tx: Prisma.TransactionClient,
  projectId: number,
  { authorId, keys, years }: { authorId: number; keys: string[]; years: BeneficiaryYear[] }
) {
  for (const { year, counts } of years) {
    const where = { projectId_year: { projectId, year } };
    const existing = await tx.projectBeneficiary.findUnique({
      where,
      select: BENEFICIARY_VALUES_SELECT,
    });
    const previousCounts = existing && toBeneficiaryCounts(existing.values);
    const changes = keys
      .map((key) => ({ field: key, from: previousCounts?.[key] ?? 0, to: counts[key] }))
      .filter(({ from, to }) => from !== to);
    if (existing && !changes.length) continue;
    await tx.projectBeneficiaryValue.deleteMany({
      where: formCategoryValuesWhere(projectId, year, keys),
    });
    const values = { create: toBeneficiaryValuesCreate(counts) };
    const beneficiary = await tx.projectBeneficiary.upsert({
      where,
      create: { year, projectId, authorId, values },
      update: { authorId, recordedAt: new Date(), values },
    });
    await logAudit(tx, {
      authorId,
      action: existing ? 'update' : 'creation',
      entity: 'beneficiary',
      entityId: beneficiary.id,
      details: { year, changes },
    });
  }
}

export async function updateProject(
  projectId: number,
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  const user = await requireUser();
  const uploadedPath = coverPathFromForm(formData);
  if (!parseId(projectId)) {
    await discardOwnedUnusedCover(uploadedPath, user.id);
    return { formError: 'El proyecto no es válido.' };
  }
  const parsed = await parseProjectForm(formData);
  if ('errors' in parsed) {
    await discardOwnedUnusedCover(uploadedPath, user.id);
    return { errors: parsed.errors };
  }
  const { keys, projectData } = parsed;
  const beneficiaryYears = [parsed.beneficiaryData, ...parsed.beneficiaryDraftData];
  let previousCover: string | null = null;
  try {
    const requestedCover = await requestedCoverPath(uploadedPath, formData, user.id);
    const rejectedCoverPath = uploadedPath !== null && requestedCover === null;
    const error = await prisma.$transaction(
      async (tx): Promise<ProjectFormState | null> => {
        const previous = await lockProject(tx, projectId);
        if (!previous) return { formError: 'El proyecto no existe o fue eliminado.' };
        previousCover = previous.coverPhoto;
        const editError = checkProjectEditable(user, previous, projectData);
        if (editError) return editError;
        if (rejectedCoverPath) return { formError: UNAVAILABLE_COVER_MESSAGE };
        const validationError = await validateProjectUpdate(tx, previous, parsed);
        if (validationError) return validationError;
        const resolved = resolveIntensity(
          projectData.intensity,
          hasDirectChildren(beneficiaryYears) ||
            (await hasDirectChildrenInOtherYears(
              tx,
              projectId,
              beneficiaryYears.map(({ year }) => year)
            ))
        );
        if ('error' in resolved) return resolved.error;
        const nextProjectData = { ...projectData, intensity: resolved.intensity };
        const cover = buildCoverUpdates(previous, requestedCover, formData);
        const relations = buildRelationUpdates(previous, parsed);
        await saveProjectChanges(tx, user.id, previous, {
          fields: [
            ...changedFields(nextProjectData, previous),
            ...cover.fields,
            ...relations.fields,
          ],
          data: { ...nextProjectData, ...cover.data, ...relations.data },
        });
        await updateBeneficiaries(tx, projectId, {
          authorId: user.id,
          keys,
          years: beneficiaryYears,
        });
        return null;
      },
      { maxWait: 10_000, timeout: 30_000 }
    );
    if (error) {
      await discardOwnedUnusedCover(uploadedPath, user.id);
      return error;
    }
    if (requestedCover && previousCover !== requestedCover) {
      await discardUnusedUploadedCover(previousCover);
    }
    await claimUploadedCover(requestedCover);
  } catch (error) {
    await discardOwnedUnusedCover(uploadedPath, user.id);
    const mapped = mapProjectDbError(error);
    if (mapped) return mapped;
    console.error('Failed to update project', error);
    return { formError: 'No se pudo actualizar el proyecto. Intentá de nuevo.' };
  }
  revalidateProject();
  if (formData.get('returnResult') === 'true') return { success: true };
  redirect(`/dashboard/projects/${projectId}`);
}

export async function deleteProject(projectId: number): Promise<{ error?: string }> {
  const user = await requireUser();
  if (!parseId(projectId)) return { error: 'El proyecto no es válido.' };
  try {
    let coverPhoto: string | null = null;
    const error = await prisma.$transaction(async (tx) => {
      const project = await tx.project.findFirst({
        where: { id: projectId, deletedAt: null },
        select: { id: true, leadCoordinatorId: true, coverPhoto: true },
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
      coverPhoto = project.coverPhoto;
      return null;
    });
    if (error) return { error };
    revalidateProject();
    await discardUnusedUploadedCover(coverPhoto);
  } catch (error) {
    console.error('Failed to delete project', error);
    return { error: 'No se pudo eliminar el proyecto. Intentá de nuevo.' };
  }
  return {};
}

type ProjectListQueryInput = {
  status: string;
  beneficiaryYear: string;
  search?: string;
  departmentId?: string;
  topicId?: string;
  strategicLineId?: string;
  partnerId?: string;
  beneficiaryCategoryId?: string;
};

export async function loadProjectsPage(
  filters: ProjectListQueryInput,
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

export async function loadProjectDataYears(
  filters: ProjectListQueryInput
): Promise<ProjectDataYear[]> {
  await requireUser();

  return listProjectDataYears(parseProjectFilters(filters));
}
