'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AuthError } from 'next-auth';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { auth, signIn } from '@/auth';
import { hashPassword, verifyPassword } from '@/lib/credentials';
import {
  getSessionExpirationTimestamp,
  SESSION_EXPIRATION_COOKIE,
  SESSION_EXPIRATION_COOKIE_OPTIONS,
} from '@/lib/auth/session-expiration';
import {
  changePasswordSchema,
  forcedPasswordChangeSchema,
  passwordSchema,
} from '@/lib/validation/password';
import { logAudit } from '@/lib/audit-log';

export type PasswordFormState = {
  errors?: Record<string, string[]>;
  formError?: string;
  success?: boolean;
};

async function updateOwnPassword(userId: number, newPassword: string): Promise<PasswordFormState> {
  const newPasswordHash = await hashPassword(newPassword);

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.user.update({
          where: { id: userId },
          data: {
            passwordHash: newPasswordHash,
            passwordChangedAt: new Date(),
            mustChangePassword: false,
          },
        });

        await logAudit(tx, {
          authorId: userId,
          action: 'passwordChange',
          entity: 'user',
          entityId: userId,
        });
      },
      { maxWait: 10_000, timeout: 30_000 }
    );
  } catch (error) {
    console.error('Failed to change password', error);
    return { formError: 'No se pudo cambiar la contraseña. Intentá de nuevo.' };
  }

  return { success: true };
}

export async function changePassword(
  _prevState: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { formError: 'Tu sesión ya no es válida. Iniciá sesión de nuevo.' };
  }

  const rawFormData = Object.fromEntries(formData);
  const parsed = changePasswordSchema.safeParse(rawFormData);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { currentPassword, newPassword } = parsed.data;

  const user = await prisma.user.findUnique({ where: { id: Number(session.user.id) } });

  if (!user || user.deletedAt || user.status !== 'active') {
    return { formError: 'Tu sesión ya no es válida. Iniciá sesión de nuevo.' };
  }

  const isCurrentPasswordValid = await verifyPassword(currentPassword, user.passwordHash);

  if (!isCurrentPasswordValid) {
    return { formError: 'La contraseña actual es incorrecta' };
  }

  return updateOwnPassword(user.id, newPassword);
}

export async function completeForcedPasswordChange(
  _prevState: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const session = await auth();

  if (!session?.user?.id) {
    return { formError: 'Tu sesión ya no es válida. Iniciá sesión de nuevo.' };
  }

  const rawFormData = Object.fromEntries(formData);
  const parsed = forcedPasswordChangeSchema.safeParse(rawFormData);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const user = await prisma.user.findUnique({ where: { id: Number(session.user.id) } });

  if (!user || user.deletedAt || user.status !== 'active') {
    return { formError: 'Tu sesión ya no es válida. Iniciá sesión de nuevo.' };
  }

  if (!user.mustChangePassword) {
    return { formError: 'La contraseña ya fue actualizada.' };
  }

  const { newPassword } = parsed.data;

  if (await verifyPassword(newPassword, user.passwordHash)) {
    return { errors: { newPassword: ['La nueva contraseña debe ser distinta a la actual.'] } };
  }

  const result = await updateOwnPassword(user.id, newPassword);

  if (!result.success) {
    return result;
  }

  const remember = Boolean(session.user.remember);

  try {
    await signIn('credentials', {
      documentId: user.documentId,
      password: newPassword,
      remember: remember ? 'true' : 'false',
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect('/login?passwordChanged=1');
    }
    throw error;
  }

  const cookieStore = await cookies();
  cookieStore.set(
    SESSION_EXPIRATION_COOKIE,
    String(getSessionExpirationTimestamp(remember)),
    SESSION_EXPIRATION_COOKIE_OPTIONS
  );

  redirect('/dashboard');
}

const resetPasswordSchema = z.object({
  userId: z.coerce.number({ error: 'Elegí una cuenta' }).int().positive('Elegí una cuenta'),
  newPassword: passwordSchema,
});

export async function resetPassword(
  _prevState: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const session = await auth();

  if (!session?.user || session.user.role !== 'admin') {
    return { formError: 'No tenés permisos para realizar esta acción.' };
  }

  const rawFormData = Object.fromEntries(formData);
  const parsed = resetPasswordSchema.safeParse(rawFormData);

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { userId, newPassword } = parsed.data;
  const adminId = Number(session.user.id);

  if (userId === adminId) {
    return { formError: 'No podés restablecer tu propia contraseña. Cambiala desde Mi perfil.' };
  }

  const targetUser = await prisma.user.findUnique({ where: { id: userId } });

  if (!targetUser || targetUser.deletedAt) {
    return { formError: 'La cuenta seleccionada no existe.' };
  }

  const newPasswordHash = await hashPassword(newPassword);

  try {
    await prisma.$transaction(
      async (tx) => {
        await tx.user.update({
          where: { id: targetUser.id },
          data: {
            passwordHash: newPasswordHash,
            passwordChangedAt: new Date(),
            mustChangePassword: true,
          },
        });

        await logAudit(tx, {
          authorId: adminId,
          action: 'passwordReset',
          entity: 'user',
          entityId: targetUser.id,
        });
      },
      { maxWait: 10_000, timeout: 30_000 }
    );
  } catch (error) {
    console.error('Failed to reset password', error);
    return { formError: 'No se pudo restablecer la contraseña. Intentá de nuevo.' };
  }

  return { success: true };
}
