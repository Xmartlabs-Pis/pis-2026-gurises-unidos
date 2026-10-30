'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@/generated/prisma/client';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { logAudit } from '@/lib/audit-log';
import { profileFormSchema, type ProfileFormState } from '@/lib/validation/profile';
import { z } from 'zod';

const INVALID_SESSION_MESSAGE = 'Tu sesión ya no es válida. Iniciá sesión de nuevo.';
const PROFILE_FIELDS = ['firstName', 'lastName', 'email'] as const;

export async function updateProfile(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const session = await auth();
  const userId = Number(session?.user?.id);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return { formError: INVALID_SESSION_MESSAGE };
  }

  const result = profileFormSchema.safeParse({
    firstName: formData.get('firstName'),
    lastName: formData.get('lastName'),
    email: formData.get('email'),
  });

  if (!result.success) {
    return { errors: z.flattenError(result.error).fieldErrors };
  }

  try {
    const transactionResult = await prisma.$transaction(async (tx) => {
      const currentUser = await tx.user.findFirst({
        where: {
          id: userId,
          status: 'active',
          deletedAt: null,
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      if (!currentUser) return null;

      const changedFields = PROFILE_FIELDS.filter(
        (field) => result.data[field] !== currentUser[field]
      );

      if (!changedFields.length) {
        return { user: currentUser, changed: false };
      }

      const updatedUser = await tx.user.update({
        where: {
          id: userId,
          status: 'active',
          deletedAt: null,
        },
        data: result.data,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      });

      await logAudit(tx, {
        authorId: userId,
        action: 'update',
        entity: 'user',
        entityId: updatedUser.id,
        details: { changedFields },
      });

      return { user: updatedUser, changed: true };
    });

    if (!transactionResult) {
      return { formError: INVALID_SESSION_MESSAGE };
    }

    if (transactionResult.changed) {
      revalidatePath('/management/profile');
    }

    return {
      success: true,
      values: {
        firstName: transactionResult.user.firstName,
        lastName: transactionResult.user.lastName,
        email: transactionResult.user.email,
      },
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return { errors: { email: ['Ya existe un usuario con ese correo electrónico.'] } };
      }

      if (error.code === 'P2003' || error.code === 'P2025') {
        return { formError: INVALID_SESSION_MESSAGE };
      }
    }

    console.error('Failed to update profile', error);
    return { formError: 'No se pudo actualizar tu perfil. Intentá de nuevo.' };
  }
}
