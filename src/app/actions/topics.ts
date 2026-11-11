'use server';

import { revalidatePath } from 'next/cache';
import { topicSchema } from '@/lib/validation/topic';
import prisma from '@/lib/prisma';
import {
  catalogWriteError,
  deleteIfUnused,
  guardCatalogId,
  parseCatalogFields,
  reactivateOrCreate,
  readCatalogAdmin,
  renameCatalogRecord,
  type CatalogActionState,
} from '@/lib/catalog-actions';

export type TopicActionState = CatalogActionState<{ name: string }>;

const DUPLICATE_NAME = 'Ya existe una temática con ese nombre.';

function revalidateTopics() {
  revalidatePath('/management/topics');
  revalidatePath('/dashboard/projects', 'layout');
}

function topicName(formData: FormData) {
  return String(formData.get('name') ?? '');
}

export async function createTopic(
  _previousState: TopicActionState,
  formData: FormData
): Promise<TopicActionState> {
  const access = await readCatalogAdmin();
  if (!access.user) return access.state;
  const user = access.user;

  const name = topicName(formData);
  const parsed = parseCatalogFields(topicSchema, { name });
  if (!parsed.ok) return parsed.state;

  try {
    const outcome = await prisma.$transaction((tx) =>
      reactivateOrCreate(tx, {
        authorId: user.id,
        entity: 'topic',
        findExisting: () =>
          tx.topic.findFirst({
            where: { name: { equals: parsed.data.name, mode: 'insensitive' } },
          }),
        reactivate: (id) =>
          tx.topic.updateMany({
            where: { id, isActive: false },
            data: { isActive: true },
          }),
        create: () => tx.topic.create({ data: { name: parsed.data.name, isActive: true } }),
      })
    );
    if (outcome === 'duplicate') return { formError: DUPLICATE_NAME, values: { name } };
  } catch (error) {
    return catalogWriteError(
      error,
      { message: DUPLICATE_NAME, values: { name } },
      { message: 'No se pudo crear la temática. Intentá de nuevo.', values: { name } }
    );
  }

  revalidateTopics();
  return { success: true };
}

export async function deleteTopic(topicId: number): Promise<TopicActionState> {
  const access = await readCatalogAdmin();
  if (!access.user) return access.state;
  const user = access.user;

  const invalid = guardCatalogId(topicId, 'La temática no es válida.');
  if (invalid) return invalid;

  try {
    const error = await prisma.$transaction((tx) =>
      deleteIfUnused(tx, {
        authorId: user.id,
        entity: 'topic',
        entityId: topicId,
        missing: 'La temática no existe o ya fue eliminada.',
        associated: 'No se puede eliminar una temática asociada a proyectos.',
        lock: () => tx.$queryRaw`SELECT "id" FROM "Topic" WHERE "id" = ${topicId} FOR UPDATE`,
        findCurrent: () =>
          tx.topic.findFirst({
            where: { id: topicId, isActive: true },
            select: { name: true },
          }),
        countProjects: () =>
          tx.project.count({
            where: { topics: { some: { id: topicId } }, deletedAt: null },
          }),
        deactivate: () => tx.topic.update({ where: { id: topicId }, data: { isActive: false } }),
      })
    );
    if (error) return { formError: error };
  } catch {
    return { formError: 'No se pudo eliminar la temática. Intentá de nuevo.' };
  }

  revalidateTopics();
  return { success: true };
}

export async function editTopic(
  topicId: number,
  _previousState: TopicActionState,
  formData: FormData
): Promise<TopicActionState> {
  const access = await readCatalogAdmin();
  if (!access.user) return access.state;
  const user = access.user;

  const invalid = guardCatalogId(topicId, 'La temática no es válida.');
  if (invalid) return invalid;

  const name = topicName(formData);
  const parsed = parseCatalogFields(topicSchema, { name });
  if (!parsed.ok) return parsed.state;

  try {
    const error = await prisma.$transaction((tx) =>
      renameCatalogRecord(tx, {
        id: topicId,
        name: parsed.data.name,
        authorId: user.id,
        entity: 'topic',
        missing: 'La temática no existe o ya fue eliminada.',
        duplicate: DUPLICATE_NAME,
        inactive: 'Ese nombre pertenece a una temática dada de baja. Elegí otro nombre.',
        lock: () => tx.$queryRaw`SELECT "id" FROM "Topic" WHERE "id" = ${topicId} FOR UPDATE`,
        findCurrent: () =>
          tx.topic.findFirst({
            where: { id: topicId, isActive: true },
            select: { name: true },
          }),
        findDuplicate: () =>
          tx.topic.findFirst({
            where: {
              id: { not: topicId },
              name: { equals: parsed.data.name, mode: 'insensitive' },
            },
            select: { id: true, isActive: true },
          }),
        update: () => tx.topic.update({ where: { id: topicId }, data: { name: parsed.data.name } }),
      })
    );
    if (error) return { formError: error, values: { name } };
  } catch (error) {
    return catalogWriteError(
      error,
      { message: DUPLICATE_NAME, values: { name: parsed.data.name } },
      { message: 'No se pudo editar la temática. Intentá de nuevo.' }
    );
  }

  revalidateTopics();
  return { success: true };
}
