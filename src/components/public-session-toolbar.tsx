import Link from 'next/link';
import { LayoutDashboard, LogOut, UserRound } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { Button, buttonVariants } from '@/components/ui/button';

export function PublicSessionToolbar({ email }: { email?: string | null }) {
  return (
    <nav
      aria-label="Navegación de sesión"
      data-slot="public-session-toolbar"
      className="bg-surface-paper text-foreground border-hairline sticky top-0 z-50 h-16 shrink-0 border-b lg:h-10"
    >
      <div className="mx-auto flex h-full w-full max-w-360 flex-col justify-center gap-1 pr-4 pl-56 sm:pr-6 sm:pl-76 lg:flex-row lg:items-center lg:justify-end lg:gap-4 lg:pr-16">
        <div className="flex min-w-0 items-center justify-end gap-2 text-sm">
          <UserRound aria-hidden="true" className="size-4 shrink-0" />
          <span className="truncate" title={email ?? undefined}>
            {email ?? 'Sesión iniciada'}
          </span>
        </div>
        <div className="flex shrink-0 items-center gap-2 self-end lg:self-auto">
          <Link
            href="/dashboard"
            aria-label="Volver al dashboard"
            title="Volver al dashboard"
            className={buttonVariants({
              className:
                'bg-surface-brand-deep hover:bg-surface-brand-deep/90 h-7 w-7 p-0 text-xs text-white sm:w-auto sm:px-2',
            })}
          >
            <LayoutDashboard aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">Volver al dashboard</span>
          </Link>
          <form action={logout}>
            <Button
              type="submit"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="bg-surface-brand-muted text-foreground hover:bg-surface-brand-muted/80 h-7 w-7 p-0 text-xs sm:w-auto sm:px-2"
            >
              <LogOut aria-hidden="true" />
              <span className="sr-only sm:not-sr-only">Cerrar sesión</span>
            </Button>
          </form>
        </div>
      </div>
    </nav>
  );
}
