'use server';

import { after } from 'next/server';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import prisma from '@/lib/prisma';
import { sendEmail } from '@/lib/email/client';
import { hashPassword, verifyPassword } from '@/lib/credentials';
import { logAudit } from '@/lib/audit-log';
import PasswordResetEmail from '@/emails/password-reset-email';
import { RESET_TOKEN_ERROR_MESSAGES } from '@/lib/auth/password-reset';
import {
  consumeUserToken,
  createUserToken,
  findValidUserToken,
  PASSWORD_RESET_TOKEN_TTL_MINUTES,
} from '@/lib/auth/user-tokens';
import { forgotPasswordFormSchema, resetPasswordWithTokenSchema } from '@/lib/validation/password';
import type { PasswordFormState } from '@/app/actions/password';
import { getAppUrl } from '@/lib/app-url';

export async function requestPasswordReset(
  _prevState: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const parsed = forgotPasswordFormSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const user = await prisma.user.findUnique({
    where: { email: parsed.data.email, deletedAt: null, status: 'active' },
  });

  if (user) {
    after(async () => {
      try {
        const resetUrl = new URL('/reset-password', getAppUrl());
        const token = await prisma.$transaction((tx) =>
          createUserToken(tx, user.id, 'passwordReset')
        );
        resetUrl.searchParams.set('token', token);

        await sendEmail({
          to: user.email,
          subject: 'Restablecé tu contraseña',
          react: (
            <PasswordResetEmail
              firstName={user.firstName}
              resetUrl={resetUrl.toString()}
              expiresInMinutes={PASSWORD_RESET_TOKEN_TTL_MINUTES}
            />
          ),
        });
      } catch (error) {
        console.error('Failed to send password reset email', error);
      }
    });
  }

  return { success: true };
}

export async function resetPasswordWithToken(
  _prevState: PasswordFormState,
  formData: FormData
): Promise<PasswordFormState> {
  const parsed = resetPasswordWithTokenSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    const { token, ...errors } = z.flattenError(parsed.error).fieldErrors;
    if (token) {
      return { formError: RESET_TOKEN_ERROR_MESSAGES.invalid };
    }
    return { errors };
  }

  const { token, newPassword } = parsed.data;
  const lookup = await findValidUserToken(token, 'passwordReset');

  if (!lookup.valid) {
    return { formError: RESET_TOKEN_ERROR_MESSAGES[lookup.reason] };
  }

  if (lookup.user.status !== 'active') {
    return { formError: RESET_TOKEN_ERROR_MESSAGES.invalid };
  }

  if (await verifyPassword(newPassword, lookup.user.passwordHash)) {
    return { errors: { newPassword: ['La nueva contraseña debe ser distinta a la actual.'] } };
  }

  const userId = lookup.user.id;
  const passwordHash = await hashPassword(newPassword);

  let result: 'ok' | 'tokenUnavailable' | 'userInactive';

  try {
    result = await prisma.$transaction(
      async (tx) => {
        if (!(await consumeUserToken(tx, lookup.tokenId))) {
          return 'tokenUnavailable';
        }

        const { count } = await tx.user.updateMany({
          where: { id: userId, status: 'active', deletedAt: null },
          data: { passwordHash, passwordChangedAt: new Date(), mustChangePassword: false },
        });

        if (count === 0) {
          return 'userInactive';
        }

        await tx.loginThrottle.deleteMany({ where: { documentId: lookup.user.documentId } });

        await logAudit(tx, {
          authorId: userId,
          action: 'passwordReset',
          entity: 'user',
          entityId: userId,
          details: { method: 'email' },
        });

        return 'ok';
      },
      { maxWait: 10_000, timeout: 30_000 }
    );
  } catch (error) {
    console.error('Failed to reset password with token', error);
    return { formError: 'No se pudo restablecer la contraseña. Intentá de nuevo.' };
  }

  if (result === 'userInactive') {
    return { formError: RESET_TOKEN_ERROR_MESSAGES.invalid };
  }

  if (result === 'tokenUnavailable') {
    const current = await findValidUserToken(token, 'passwordReset');
    return { formError: RESET_TOKEN_ERROR_MESSAGES[current.valid ? 'used' : current.reason] };
  }

  redirect('/login?passwordChanged=1');
}
