import UserInvitationEmail from '@/emails/user-invitation-email';
import { getAppUrl } from '@/lib/app-url';
import { INVITATION_TOKEN_TTL_DAYS } from '@/lib/auth/user-tokens';
import { sendEmail } from '@/lib/email/client';

export type InvitedUser = { id: number; firstName: string; email: string };

export async function sendInvitationEmail(user: InvitedUser, token: string) {
  try {
    const invitationUrl = new URL('/accept-invitation', getAppUrl());
    invitationUrl.searchParams.set('token', token);

    return await sendEmail({
      to: user.email,
      subject: 'Te invitaron a Gurises Unidos',
      react: (
        <UserInvitationEmail
          firstName={user.firstName}
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
