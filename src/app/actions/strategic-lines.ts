'use server';

import { revalidatePath } from 'next/cache';
import { strategicLineSchema } from '@/lib/validation/strategic-line';
import prisma from '@/lib/prisma';
import {
  catalogWriteError,
  deleteIfUnused,
  guardCatalogId,
  parseCatalogFields,
  reactivateOrCreate,
  readCatalogAdmin,
  readName,
  renameCatalogRecord,
  type CatalogActionState,
} from '@/lib/catalog-actions';

export type StrategicLineActionState = CatalogActionState<{ name: string }>;

const DUPLICATE_NAME = 'Ya existe una línea estratégica con ese nombre.';

function revalidateStrategicLines() {
  revalidatePath('/management/strategic-lines');
  revalidatePath('/dashboard/projects', 'layout');
}

export async function createStrategicLine(
  _previousState: StrategicLineActionState,
  formData: FormData
): Promise<StrategicLineActionState> {
  const access = await readCatalogAdmin();
  if (!access.user) return access.state;
  const user = access.user;

  const name = readName(formData);
  const parsed = parseCatalogFields(strategicLineSchema, { name });
  if (!parsed.ok) return parsed.state;

  try {
    const outcome = await prisma.$transaction((tx) =>
      reactivateOrCreate(tx, {
        authorId: user.id,
        entity: 'strategicLine',
        findExisting: () =>
          tx.strategicLine.findFirst({
            where: { name: { equals: parsed.data.name, mode: 'insensitive' } },
          }),
        reactivate: (id) =>
          tx.strategicLine.updateMany({
            where: { id, isActive: false },
            data: { isActive: true },
          }),
        create: () => tx.strategicLine.create({ data: { name: parsed.data.name, isActive: true } }),
      })
    );
    if (outcome === 'duplicate') return { formError: DUPLICATE_NAME, values: { name } };
  } catch (error) {
    return catalogWriteError(
      error,
      { message: DUPLICATE_NAME, values: { name } },
      { message: 'No se pudo crear la línea estratégica. Intentá de nuevo.', values: { name } }
    );
  }

  revalidateStrategicLines();
  return { success: true };
}

export async function editStrategicLine(
  id: number,
  _previousState: StrategicLineActionState,
  formData: FormData
): Promise<StrategicLineActionState> {
  const access = await readCatalogAdmin();
  if (!access.user) return access.state;
  const user = access.user;

  const invalid = guardCatalogId(id, 'La línea estratégica no es válida.');
  if (invalid) return invalid;

  const name = readName(formData);
  const parsed = parseCatalogFields(strategicLineSchema, { name });
  if (!parsed.ok) return parsed.state;

  try {
    const error = await prisma.$transaction((tx) =>
      renameCatalogRecord(tx, {
        id,
        name: parsed.data.name,
        authorId: user.id,
        entity: 'strategicLine',
        missing: 'La línea estratégica no existe o ya fue eliminada.',
        duplicate: DUPLICATE_NAME,
        inactive: 'Ese nombre pertenece a una línea estratégica dada de baja. Elegí otro nombre.',
        lock: () => tx.$queryRaw`SELECT "id" FROM "StrategicLine" WHERE "id" = ${id} FOR UPDATE`,
        findCurrent: () =>
          tx.strategicLine.findFirst({ where: { id, isActive: true }, select: { name: true } }),
        findDuplicate: () =>
          tx.strategicLine.findFirst({
            where: { id: { not: id }, name: { equals: parsed.data.name, mode: 'insensitive' } },
            select: { id: true, isActive: true },
          }),
        update: () => tx.strategicLine.update({ where: { id }, data: { name: parsed.data.name } }),
      })
    );
    if (error) return { formError: error, values: { name } };
  } catch (error) {
    return catalogWriteError(
      error,
      { message: DUPLICATE_NAME, values: { name } },
      { message: 'No se pudo editar la línea estratégica. Intentá de nuevo.', values: { name } }
    );
  }

  revalidateStrategicLines();
  return { success: true };
}

export async function deleteStrategicLine(id: number): Promise<StrategicLineActionState> {
  const access = await readCatalogAdmin();
  if (!access.user) return access.state;
  const user = access.user;

  const invalid = guardCatalogId(id, 'La línea estratégica no es válida.');
  if (invalid) return invalid;

  try {
    const error = await prisma.$transaction((tx) =>
      deleteIfUnused(tx, {
        authorId: user.id,
        entity: 'strategicLine',
        entityId: id,
        missing: 'La línea estratégica no existe o ya fue eliminada.',
        associated: 'No se puede eliminar una línea estratégica asociada a proyectos.',
        lock: () => tx.$queryRaw`SELECT "id" FROM "StrategicLine" WHERE "id" = ${id} FOR UPDATE`,
        findCurrent: () =>
          tx.strategicLine.findFirst({
            where: { id, isActive: true },
            select: { name: true },
          }),
        countProjects: () =>
          tx.project.count({
            where: { deletedAt: null, strategicLines: { some: { id } } },
          }),
        deactivate: () => tx.strategicLine.update({ where: { id }, data: { isActive: false } }),
      })
    );
    if (error) return { formError: error };
  } catch {
    return { formError: 'No se pudo eliminar la línea estratégica. Intentá de nuevo.' };
  }

  revalidateStrategicLines();
  return { success: true };
}
