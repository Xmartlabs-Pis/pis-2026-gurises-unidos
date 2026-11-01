import Link from 'next/link';
import { AuthPageShell } from '@/components/auth-page-shell';
import { PasswordResetForm } from '@/components/password-reset-form';
import { acceptInvitation } from '@/app/actions/invitation';
import { INVITATION_TOKEN_ERROR_MESSAGES } from '@/lib/auth/invitation';
import { findValidUserToken, type UserTokenFailureReason } from '@/lib/auth/user-tokens';

function InvalidInvitation({ reason }: { reason: UserTokenFailureReason }) {
  return (
    <AuthPageShell
      title="Invitación no válida"
      description={INVITATION_TOKEN_ERROR_MESSAGES[reason]}
    >
      <Link
        href="/login"
        className="text-primary self-center text-sm leading-5 font-medium tracking-normal hover:underline"
      >
        Ir al inicio de sesión
      </Link>
    </AuthPageShell>
  );
}

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;

  if (typeof token !== 'string') {
    return <InvalidInvitation reason="invalid" />;
  }

  const lookup = await findValidUserToken(token, 'invitation');

  if (!lookup.valid) {
    return <InvalidInvitation reason={lookup.reason} />;
  }

  if (lookup.user.status !== 'pendingInvitation') {
    return <InvalidInvitation reason="used" />;
  }

  return (
    <AuthPageShell
      title={`Hola, ${lookup.user.firstName}`}
      description={`Elegí una contraseña para completar tu registro. Vas a ingresar con tu cédula ${lookup.user.documentId}.`}
    >
      <PasswordResetForm action={acceptInvitation} token={token} submitLabel="Completar registro" />
    </AuthPageShell>
  );
}
