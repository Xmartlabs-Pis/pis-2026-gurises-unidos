import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { logout } from '@/app/actions/auth';
import { AuthPageShell } from '@/components/auth-page-shell';
import { PasswordResetForm } from '@/components/password-reset-form';
import { Button } from '@/components/ui/button';

export default async function PasswordResetPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (!session.user.mustChangePassword) {
    redirect('/dashboard');
  }

  return (
    <AuthPageShell
      title="Cambiá tu contraseña"
      description="Por seguridad, tenés que elegir una contraseña nueva antes de continuar."
    >
      <PasswordResetForm />
      <form action={logout}>
        <Button type="submit" variant="ghost" className="h-9 w-full">
          Cerrar sesión
        </Button>
      </form>
    </AuthPageShell>
  );
}
