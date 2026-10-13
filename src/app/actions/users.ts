'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@/generated/prisma/client';
import type { UserStatus } from '@/generated/prisma/enums';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/auth/require-user';
import { parseId } from '@/lib/validation/ids';
import { PRESERVED_FIELDS, userFormSchema, type UserFormState } from '@/lib/validation/user';
import { logAudit } from '@/lib/audit-log';
import bcrypt from 'bcryptjs';
import { z } from 'zod';

export async function createUser(
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'admin') {
    redirect('/dashboard');
  }

  if (formData.get('intent') === 'submit') {
    const result = userFormSchema.safeParse(Object.fromEntries(formData));
    const values = Object.fromEntries(
      PRESERVED_FIELDS.map((field) => [field, String(formData.get(field) ?? '')])
    );

    if (!result.success) {
      return { errors: z.flattenError(result.error).fieldErrors, values };
    }

    const userData = result.data;
    const passwordHash = await bcrypt.hash(userData.password, 10);

    const restoreConfirmed = formData.get('confirmRestore') === 'true';
    let outcome: 'created' | 'restored' | 'restoreConfirmationRequired';

    try {
      outcome = await prisma.$transaction(async (tx) => {
        const authorId = Number(session.user.id);
        const profile = {
          firstName: userData.firstName,
          lastName: userData.lastName,
          email: userData.email,
          role: userData.role,
          status: 'active' as const,
          passwordHash,
          mustChangePassword: true,
        };

        const deletedUser = await tx.user.findFirst({
          where: { documentId: userData.documentId, deletedAt: { not: null } },
          select: { id: true },
        });

        if (deletedUser && !restoreConfirmed) {
          return 'restoreConfirmationRequired';
        }

        if (deletedUser) {
          await tx.user.update({
            where: { id: deletedUser.id, deletedAt: { not: null } },
            data: { ...profile, passwordChangedAt: new Date(), deletedAt: null },
          });
          await logAudit(tx, {
            authorId,
            action: 'creation',
            entity: 'user',
            entityId: deletedUser.id,
            details: { restored: true },
          });
          return 'restored';
        }

        const createdUser = await tx.user.create({
          data: { ...profile, documentId: userData.documentId, createdBy: authorId },
        });
        await logAudit(tx, {
          authorId,
          action: 'creation',
          entity: 'user',
          entityId: createdUser.id,
        });
        return 'created';
      });
    } catch (error) {
      const isPrismaError = error instanceof Prisma.PrismaClientKnownRequestError;

      if (isPrismaError) {
        const isDuplicateError = error.code === 'P2002';
        const isForeignKeyError = error.code === 'P2003';

        if (isDuplicateError) {
          const target = error.meta?.target;
          const fields = Array.isArray(target) ? target.map(String) : [String(target ?? '')];

          if (fields.some((field) => field.includes('documentId'))) {
            return { formError: 'Ya existe un usuario con ese documento.', values };
          }

          if (fields.some((field) => field.includes('email'))) {
            return { formError: 'Ya existe un usuario con ese correo electrónico.', values };
          }
        }

        if (isForeignKeyError) {
          return {
            formError: 'Tu sesión ya no es válida. Cerrá sesión y volvé a ingresar.',
            values,
          };
        }
      }
      return { formError: 'No se pudo crear el usuario. Intentá de nuevo.', values };
    }

    if (outcome === 'restoreConfirmationRequired') {
      return { restoreConfirmationRequired: true, values };
    }

    if (outcome === 'restored') {
      revalidatePath('/management/users');
      return { restored: true };
    }

    redirect('/management/users');
  }

  return {};
}

export type ToggleableUserStatus = Extract<UserStatus, 'active' | 'disabled'>;

export type UpdateUserStatusResult = { error?: string; success?: boolean };

export async function updateUserStatus(
  userId: number,
  status: ToggleableUserStatus
): Promise<UpdateUserStatusResult> {
  const actor = await requireUser();

  if (actor.role !== 'admin') {
    return { error: 'No tenés permisos para realizar esta acción.' };
  }

  const targetId = parseId(userId);

  if (!targetId || (status !== 'active' && status !== 'disabled')) {
    return { error: 'El usuario no es válido.' };
  }

  if (targetId === actor.id) {
    return { error: 'No podés cambiar tu propio estado.' };
  }

  try {
    const error = await prisma.$transaction(
      async (tx): Promise<string | null> => {
        const target = await tx.user.findUnique({
          where: { id: targetId, deletedAt: null },
          select: { role: true, status: true },
        });

        if (!target) {
          return 'El usuario no existe.';
        }

        if (status === 'disabled' && target.status === 'disabled') {
          return 'El usuario ya está deshabilitado.';
        }

        if (status === 'disabled' && target.status === 'pendingInvitation') {
          return 'No se puede deshabilitar a un usuario con invitación pendiente.';
        }

        if (status === 'active' && target.status !== 'disabled') {
          return 'El usuario ya está habilitado.';
        }

        if (status === 'disabled' && target.role === 'admin') {
          const remainingAdmins = await tx.user.count({
            where: { role: 'admin', status: 'active', deletedAt: null, id: { not: targetId } },
          });

          if (remainingAdmins === 0) {
            return 'No se puede deshabilitar al último administrador activo.';
          }
        }

        await tx.user.update({ where: { id: targetId }, data: { status } });
        await logAudit(tx, {
          authorId: actor.id,
          action: 'update',
          entity: 'user',
          entityId: targetId,
          details: { changes: [{ field: 'status', from: target.status, to: status }] },
        });

        return null;
      },
      // Serializable so two admins disabling each other at once can't leave zero active admins
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 30_000,
      }
    );

    if (error) {
      return { error };
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return { error: 'Otra operación modificó los usuarios al mismo tiempo. Intentá de nuevo.' };
    }

    console.error('Failed to update user status', error);
    return { error: 'No se pudo cambiar el estado del usuario. Intentá de nuevo.' };
  }

  revalidatePath('/management/users');
  return { success: true };
}

export type DeleteUserResult = { error?: string; success?: boolean };

export async function deleteUser(userId: number): Promise<DeleteUserResult> {
  const actor = await requireUser();

  if (actor.role !== 'admin') {
    return { error: 'No tenés permisos para realizar esta acción.' };
  }

  const targetId = parseId(userId);

  if (!targetId) {
    return { error: 'El usuario no es válido.' };
  }

  if (targetId === actor.id) {
    return { error: 'No podés darte de baja a vos mismo.' };
  }

  try {
    const error = await prisma.$transaction(
      async (tx): Promise<string | null> => {
        const target = await tx.user.findUnique({
          where: { id: targetId },
          select: { role: true, deletedAt: true },
        });

        if (!target || target.deletedAt) {
          return 'El usuario no existe o ya fue dado de baja.';
        }

        if (target.role === 'admin') {
          const remainingAdmins = await tx.user.count({
            where: { role: 'admin', status: 'active', deletedAt: null, id: { not: targetId } },
          });

          if (remainingAdmins === 0) {
            return 'No se puede dar de baja al último administrador activo.';
          }
        }

        await tx.user.update({ where: { id: targetId }, data: { deletedAt: new Date() } });
        await logAudit(tx, {
          authorId: actor.id,
          action: 'deletion',
          entity: 'user',
          entityId: targetId,
        });

        return null;
      },
      // Serializable so two admins removing each other at once can't leave zero admins
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 10_000,
        timeout: 30_000,
      }
    );

    if (error) {
      return { error };
    }
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034') {
      return { error: 'Otra operación modificó los usuarios al mismo tiempo. Intentá de nuevo.' };
    }

    console.error('Failed to delete user', error);
    return { error: 'No se pudo dar de baja al usuario. Intentá de nuevo.' };
  }

  revalidatePath('/management/users');
  return { success: true };
}
