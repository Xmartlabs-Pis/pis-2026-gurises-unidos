'use server';

import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { hashPassword } from '@/lib/credentials';
import { logAudit } from '@/lib/audit-log';
import { INVITATION_TOKEN_ERROR_MESSAGES } from '@/lib/auth/invitation';
import { consumeUserToken, findValidUserToken } from '@/lib/auth/user-tokens';
import { resetPasswordWithTokenSchema } from '@/lib/validation/password';
import type { PasswordFormState } from '@/app/actions/password';

class InvitationNoLongerPendingError extends Error {}

export async function acceptInvitation(
  _prevState: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const parsed = resetPasswordWithTokenSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const { token, ...errors } = parsed.error.flatten().fieldErrors;
    if (token) {
      return { formError: INVITATION_TOKEN_ERROR_MESSAGES.invalid };
    }
    return { errors };
  }

  const { token, newPassword } = parsed.data;
  const lookup = await findValidUserToken(token, 'invitation');

  if (!lookup.valid) {
    return { formError: INVITATION_TOKEN_ERROR_MESSAGES[lookup.reason] };
  }

  if (lookup.user.status !== 'pendingInvitation') {
    return { formError: INVITATION_TOKEN_ERROR_MESSAGES.used };
  }

  const userId = lookup.user.id;
  const passwordHash = await hashPassword(newPassword);

  let accepted: boolean;

  try {
    accepted = await prisma.$transaction(
      async (tx) => {
        if (!(await consumeUserToken(tx, lookup.tokenId))) {
          return false;
        }

        const { count } = await tx.user.updateMany({
          where: { id: userId, status: 'pendingInvitation', deletedAt: null },
          data: {
            passwordHash,
            passwordChangedAt: new Date(),
            mustChangePassword: false,
            status: 'active',
          },
        });

        if (count !== 1) {
          throw new InvitationNoLongerPendingError();
        }

        await logAudit(tx, {
          authorId: userId,
          action: 'update',
          entity: 'user',
          entityId: userId,
          details: { changes: [{ field: 'status', from: 'pendingInvitation', to: 'active' }] },
        });

        return true;
      },
      { maxWait: 10_000, timeout: 30_000 }
    );
  } catch (error) {
    if (error instanceof InvitationNoLongerPendingError) {
      return { formError: INVITATION_TOKEN_ERROR_MESSAGES.invalid };
    }

    console.error('Failed to accept invitation', error);
    return { formError: 'No se pudo completar el registro. Intentá de nuevo.' };
  }

  if (!accepted) {
    const current = await findValidUserToken(token, 'invitation');
    return { formError: INVITATION_TOKEN_ERROR_MESSAGES[current.valid ? 'used' : current.reason] };
  }

  redirect('/login?invitationAccepted=1');
}
