import Link from 'next/link';
import { AuthPageShell } from '@/components/auth-page-shell';
import { ForgotPasswordForm } from '@/components/forgot-password-form';

export default function ForgotPasswordPage() {
  return (
    <AuthPageShell
      title="Recuperá tu contraseña"
      description="Ingresá el correo de tu cuenta y te enviamos un enlace para elegir una contraseña nueva."
    >
      <ForgotPasswordForm />
      <Link
        href="/login"
        className="text-primary self-center text-sm leading-5 font-medium tracking-normal hover:underline"
      >
        Volver al inicio de sesión
      </Link>
    </AuthPageShell>
  );
}
