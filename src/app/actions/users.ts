'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@/generated/prisma/client';
import type { UserStatus } from '@/generated/prisma/enums';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { requireUser } from '@/lib/auth/require-user';
import { parseId } from '@/lib/validation/ids';
import { PRESERVED_FIELDS, userEditFormSchema, type UserFormState } from '@/lib/validation/user';
import { logAudit } from '@/lib/audit-log';
import { mapUserDbError } from '@/lib/users/map-user-db-error';
import { createUserToken } from '@/lib/auth/user-tokens';
import { hashPassword } from '@/lib/credentials';
import { sendInvitationEmail, type InvitedUser } from '@/lib/users/invitation';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

// Serializable so two admins acting on each other at once can't leave zero active admins
const ADMIN_GUARD_TRANSACTION_OPTIONS = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  maxWait: 10_000,
  timeout: 30_000,
};

const EDITABLE_USER_FIELDS = ['firstName', 'lastName', 'documentId', 'email', 'role'] as const;

async function isLastActiveAdmin(tx: Prisma.TransactionClient, userId: number) {
  const remainingAdmins = await tx.user.count({
    where: { role: 'admin', status: 'active', deletedAt: null, id: { not: userId } },
  });
  return remainingAdmins === 0;
}

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

  const result = userEditFormSchema.safeParse(Object.fromEntries(formData));
  const values = Object.fromEntries(
    PRESERVED_FIELDS.map((field) => [field, String(formData.get(field) ?? '')])
  );

  if (!result.success) {
    return { errors: z.flattenError(result.error).fieldErrors, values };
  }

  const userData = result.data;
  // Invited users have no password until they accept the invitation; this hash matches nothing
  const passwordHash = await hashPassword(randomBytes(32).toString('base64url'));

  const restoreConfirmed = formData.get('confirmRestore') === 'true';
  let outcome:
    | { kind: 'restoreConfirmationRequired' }
    | { kind: 'created' | 'restored'; user: InvitedUser; token: string };

  try {
    outcome = await prisma.$transaction(async (tx) => {
      const authorId = Number(session.user.id);
      const profile = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        role: userData.role,
        status: 'pendingInvitation' as const,
        passwordHash,
        mustChangePassword: false,
      };

      const deletedUser = await tx.user.findFirst({
        where: { documentId: userData.documentId, deletedAt: { not: null } },
        select: { id: true },
      });

      if (deletedUser && !restoreConfirmed) {
        return { kind: 'restoreConfirmationRequired' as const };
      }

      if (deletedUser) {
        const restoredUser = await tx.user.update({
          where: { id: deletedUser.id, deletedAt: { not: null } },
          data: { ...profile, passwordChangedAt: null, deletedAt: null },
        });
        await logAudit(tx, {
          authorId,
          action: 'creation',
          entity: 'user',
          entityId: restoredUser.id,
          details: { restored: true },
        });
        const token = await createUserToken(tx, restoredUser.id, 'invitation');
        return { kind: 'restored' as const, user: restoredUser, token };
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
      const token = await createUserToken(tx, createdUser.id, 'invitation');
      return { kind: 'created' as const, user: createdUser, token };
    });
  } catch (error) {
    const dbError = mapUserDbError(error);

    if (dbError) {
      return { formError: dbError, values };
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return {
        formError: 'Tu sesión ya no es válida. Cerrá sesión y volvé a ingresar.',
        values,
      };
    }
    return { formError: 'No se pudo crear el usuario. Intentá de nuevo.', values };
  }

  if (outcome.kind === 'restoreConfirmationRequired') {
    return { restoreConfirmationRequired: true, values };
  }

  await sendInvitationEmail(outcome.user, outcome.token);

  if (outcome.kind === 'restored') {
    revalidatePath('/management/users');
    return { restored: true };
  }

  redirect('/management/users');
}

export type ResendInvitationResult = { error?: string; success?: boolean };

export async function resendInvitation(userId: number): Promise<ResendInvitationResult> {
  const actor = await requireUser();

  if (actor.role !== 'admin') {
    return { error: 'No tenés permisos para realizar esta acción.' };
  }

  const targetId = parseId(userId);

  if (!targetId) {
    return { error: 'El usuario no es válido.' };
  }

  const target = await prisma.user.findUnique({
    where: { id: targetId, deletedAt: null },
    select: { id: true, firstName: true, email: true, status: true },
  });

  if (!target) {
    return { error: 'El usuario no existe.' };
  }

  if (target.status !== 'pendingInvitation') {
    return { error: 'El usuario no tiene una invitación pendiente.' };
  }

  let token: string;

  try {
    token = await prisma.$transaction((tx) => createUserToken(tx, target.id, 'invitation'));
  } catch (error) {
    console.error('Failed to create invitation token', error);
    return { error: 'No se pudo reenviar la invitación. Intentá de nuevo.' };
  }

  if (!(await sendInvitationEmail(target, token))) {
    return { error: 'No se pudo enviar el correo de invitación. Intentá de nuevo.' };
  }

  return { success: true };
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
    const error = await prisma.$transaction(async (tx): Promise<string | null> => {
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

      if (
        status === 'disabled' &&
        target.role === 'admin' &&
        (await isLastActiveAdmin(tx, targetId))
      ) {
        return 'No se puede deshabilitar al último administrador activo.';
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
    }, ADMIN_GUARD_TRANSACTION_OPTIONS);

    if (error) {
      return { error };
    }
  } catch (error) {
    const dbError = mapUserDbError(error);

    if (dbError) {
      return { error: dbError };
    }

    console.error('Failed to update user status', error);
    return { error: 'No se pudo cambiar el estado del usuario. Intentá de nuevo.' };
  }

  revalidatePath('/management/users');
  revalidatePath(`/management/users/${targetId}/edit`);
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
    const error = await prisma.$transaction(async (tx): Promise<string | null> => {
      const target = await tx.user.findUnique({
        where: { id: targetId },
        select: { role: true, deletedAt: true },
      });

      if (!target || target.deletedAt) {
        return 'El usuario no existe o ya fue dado de baja.';
      }

      if (target.role === 'admin' && (await isLastActiveAdmin(tx, targetId))) {
        return 'No se puede dar de baja al último administrador activo.';
      }

      await tx.user.update({ where: { id: targetId }, data: { deletedAt: new Date() } });
      await logAudit(tx, {
        authorId: actor.id,
        action: 'deletion',
        entity: 'user',
        entityId: targetId,
      });

      return null;
    }, ADMIN_GUARD_TRANSACTION_OPTIONS);

    if (error) {
      return { error };
    }
  } catch (error) {
    const dbError = mapUserDbError(error);

    if (dbError) {
      return { error: dbError };
    }

    console.error('Failed to delete user', error);
    return { error: 'No se pudo dar de baja al usuario. Intentá de nuevo.' };
  }

  revalidatePath('/management/users');
  return { success: true };
}

export async function updateUser(
  userId: number,
  _prevState: UserFormState,
  formData: FormData
): Promise<UserFormState> {
  const actor = await requireUser();

  if (actor.role !== 'admin') {
    return { formError: 'No tenés permisos para realizar esta acción.' };
  }

  const targetId = parseId(userId);

  if (!targetId) {
    return { formError: 'El usuario no es válido.' };
  }

  if (targetId === actor.id) {
    return { formError: 'No podés editar tu propio usuario desde acá.' };
  }

  const result = userEditFormSchema.safeParse(Object.fromEntries(formData));
  const values = Object.fromEntries(
    PRESERVED_FIELDS.map((field) => [field, String(formData.get(field) ?? '')])
  );

  if (!result.success) {
    return { errors: z.flattenError(result.error).fieldErrors, values };
  }

  const userData = result.data;

  try {
    const error = await prisma.$transaction(async (tx): Promise<string | null> => {
      const target = await tx.user.findUnique({
        where: { id: targetId, deletedAt: null },
        select: {
          firstName: true,
          lastName: true,
          documentId: true,
          email: true,
          role: true,
          status: true,
        },
      });

      if (!target) {
        return 'El usuario no existe.';
      }

      const demotesActiveAdmin =
        target.role === 'admin' && target.status === 'active' && userData.role !== 'admin';

      if (demotesActiveAdmin && (await isLastActiveAdmin(tx, targetId))) {
        return 'No se puede cambiar el rol del último administrador activo.';
      }

      const changedFields = EDITABLE_USER_FIELDS.filter(
        (field) => userData[field] !== target[field]
      );

      if (!changedFields.length) {
        return null;
      }

      await tx.user.update({ where: { id: targetId }, data: userData });
      await logAudit(tx, {
        authorId: actor.id,
        action: 'update',
        entity: 'user',
        entityId: targetId,
        details: {
          changedFields,
          ...(changedFields.includes('role') && {
            changes: [{ field: 'role', from: target.role, to: userData.role }],
          }),
        },
      });

      return null;
    }, ADMIN_GUARD_TRANSACTION_OPTIONS);

    if (error) {
      return { formError: error, values };
    }
  } catch (error) {
    const dbError = mapUserDbError(error);

    if (dbError) {
      return { formError: dbError, values };
    }

    console.error('Failed to update user', error);
    return { formError: 'No se pudo actualizar el usuario. Intentá de nuevo.', values };
  }

  revalidatePath('/management/users');
  redirect('/management/users');
}
