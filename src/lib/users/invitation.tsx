import UserInvitationEmail from '@/emails/user-invitation-email';
import type { UserRole } from '@/generated/prisma/enums';
import { getAppUrl } from '@/lib/app-url';
import { INVITATION_TOKEN_TTL_DAYS } from '@/lib/auth/user-tokens';
import { sendEmail } from '@/lib/email/client';
import prisma from '@/lib/prisma';
import { ROLE_LABELS } from '@/lib/users/constants';
import { fullName } from '@/lib/users/format';

export type InvitedUser = { id: number; firstName: string; email: string; role: UserRole };

const FALLBACK_INVITER_NAME = 'un administrador';

export async function sendInvitationEmail(user: InvitedUser, token: string, inviterId: number) {
  try {
    const invitationUrl = new URL('/accept-invitation', getAppUrl());
    invitationUrl.searchParams.set('token', token);

    const inviter = await prisma.user.findUnique({
      where: { id: inviterId },
      select: { firstName: true, lastName: true },
    });

    const invitedByName = inviter ? fullName(inviter) : FALLBACK_INVITER_NAME;

    return await sendEmail({
      to: user.email,
      subject: 'Te damos la bienvenida a la plataforma',
      react: (
        <UserInvitationEmail
          firstName={user.firstName}
          invitedByName={invitedByName}
          invitedByFirstName={inviter?.firstName ?? FALLBACK_INVITER_NAME}
          roleLabel={ROLE_LABELS[user.role]}
          invitationUrl={invitationUrl.toString()}
          expiresInDays={INVITATION_TOKEN_TTL_DAYS}
        />
      ),
    });
  } catch (error) {
    console.error(`Failed to send invitation email to user ${user.id}`, error);
    return false;
  }
}
