import Link from 'next/link';
import { AuthPageShell } from '@/components/auth-page-shell';
import { PasswordResetForm } from '@/components/password-reset-form';
import { resetPasswordWithToken } from '@/app/actions/password-recovery';
import { RESET_TOKEN_ERROR_MESSAGES } from '@/lib/auth/password-reset';
import { findValidUserToken, type UserTokenFailureReason } from '@/lib/auth/user-tokens';

function InvalidLink({ reason }: { reason: UserTokenFailureReason }) {
  return (
    <AuthPageShell title="Enlace no válido" description={RESET_TOKEN_ERROR_MESSAGES[reason]}>
      <Link
        href="/forgot-password"
        className="text-primary self-center text-sm leading-5 font-medium tracking-normal hover:underline"
      >
        Pedir un enlace nuevo
      </Link>
    </AuthPageShell>
  );
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>;
}) {
  const { token } = await searchParams;

  if (typeof token !== 'string') {
    return <InvalidLink reason="invalid" />;
  }

  const lookup = await findValidUserToken(token, 'passwordReset');

  if (!lookup.valid) {
    return <InvalidLink reason={lookup.reason} />;
  }

  if (lookup.user.status !== 'active') {
    return <InvalidLink reason="invalid" />;
  }

  return (
    <AuthPageShell
      title="Elegí una contraseña nueva"
      description="Ingresá tu nueva contraseña. Vas a poder iniciar sesión con ella apenas la guardes."
    >
      <PasswordResetForm action={resetPasswordWithToken} token={token} />
    </AuthPageShell>
  );
}
