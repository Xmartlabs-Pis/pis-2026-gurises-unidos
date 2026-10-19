import Image from 'next/image';
import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { logout } from '@/app/actions/auth';
import { PasswordResetForm } from '@/components/password-reset-form';
import { Button } from '@/components/ui/button';
import icon from '@/app/icon.png';
import { version } from '@/lib/version';

export default async function PasswordResetPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (!session.user.mustChangePassword) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen w-full flex-col font-sans lg:h-screen lg:flex-row">
      <div className="bg-background flex flex-1 flex-col justify-between gap-6 pt-10 pr-6 pb-8 pl-6 lg:mx-auto lg:w-140 lg:min-w-140 lg:gap-0 lg:pt-14 lg:pr-18 lg:pb-10 lg:pl-18">
        <div className="flex h-11 flex-row gap-2.5 lg:gap-3">
          <Image src={icon} className="h-11 basis-11 rounded-xl" alt="Logo" />
          <div className="flex flex-col gap-1">
            <p className="text-primary text-base leading-6 font-semibold tracking-normal">
              Gurises Unidos
            </p>
            <p className="text-muted-foreground text-xs leading-4 font-normal tracking-normal">
              ONG Uruguay
            </p>
          </div>
        </div>
        <div className="mx-auto flex max-w-md flex-1 flex-col justify-center gap-6">
          <div className="flex flex-col gap-1.5 lg:gap-2">
            <p className="text-primary text-3xl leading-9 font-bold tracking-normal">
              Cambiá tu contraseña
            </p>
            <p className="text-muted-foreground text-sm leading-5 font-normal tracking-normal">
              Por seguridad, tenés que elegir una contraseña nueva antes de continuar.
            </p>
          </div>
          <PasswordResetForm />
          <form action={logout}>
            <Button type="submit" variant="ghost" className="h-9 w-full">
              Cerrar sesión
            </Button>
          </form>
        </div>
        <footer className="hidden flex-col gap-2 lg:flex">
          <p className="text-muted-foreground text-xs leading-4 font-normal tracking-normal">
            Plataforma interna de gestión de Gurises Unidos.
          </p>
          <p className="text-muted-foreground text-xs leading-4 font-normal tracking-normal">
            Versión v{version}
          </p>
        </footer>
      </div>
      <footer className="bg-background flex flex-col gap-0.5 p-6 pt-5 lg:hidden">
        <p className="text-muted-foreground text-xs leading-4 font-normal tracking-normal">
          Plataforma interna de gestión de Gurises Unidos.
        </p>
        <p className="text-muted-foreground text-xs leading-4 font-normal tracking-normal">
          Versión v{version}
        </p>
      </footer>
    </div>
  );
}
