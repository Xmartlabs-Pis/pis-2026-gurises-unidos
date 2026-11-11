'use client';

import { useId, useState } from 'react';
import Link from 'next/link';
import { LayoutDashboard, LogOut, Menu, UserRound, X } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { Button, buttonVariants } from '@/components/ui/button';

export function PublicSessionToolbar({ email }: { email?: string | null }) {
  const [isOpen, setIsOpen] = useState(false);
  const panelId = useId();

  return (
    <nav
      aria-label="Navegación de sesión"
      data-slot="public-session-toolbar"
      className="text-foreground border-hairline lg:bg-surface-paper pointer-events-none fixed inset-x-0 top-0 z-70 h-0 lg:pointer-events-auto lg:sticky lg:z-50 lg:h-10 lg:shrink-0 lg:border-b"
    >
      <div className="flex h-14 items-center justify-end px-4 sm:px-6 lg:hidden">
        <Button
          type="button"
          size="icon"
          className="bg-surface-brand-deep hover:bg-surface-brand-deep pointer-events-auto size-11 rounded-xl text-white transition-none [-webkit-tap-highlight-color:transparent] active:translate-y-0"
          aria-label={isOpen ? 'Cerrar menú de sesión' : 'Abrir menú de sesión'}
          aria-expanded={isOpen}
          aria-controls={panelId}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
        </Button>
      </div>
      <div
        id={panelId}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            setIsOpen(false);
            event.currentTarget.parentElement?.querySelector('button')?.focus();
          }
        }}
        className={`bg-surface-brand-deep border-hairline lg:bg-surface-paper lg:text-foreground pointer-events-auto absolute top-16 right-4 left-4 flex-col gap-4 rounded-2xl border border-white/15 p-4 text-white shadow-xl sm:right-6 sm:left-auto sm:w-80 lg:static lg:mx-auto lg:flex lg:h-full lg:w-full lg:max-w-360 lg:flex-row lg:items-center lg:justify-end lg:gap-4 lg:rounded-none lg:border-0 lg:py-0 lg:pr-16 lg:pl-76 lg:shadow-none ${isOpen ? 'flex' : 'hidden'}`}
      >
        <div className="flex min-w-0 items-center gap-3 border-b border-white/15 pb-4 text-sm lg:justify-end lg:gap-2 lg:border-0 lg:pb-0">
          <UserRound
            aria-hidden="true"
            className="size-9 shrink-0 rounded-full bg-white/10 p-2 lg:size-4 lg:rounded-none lg:bg-transparent lg:p-0"
          />
          <span className="min-w-0 break-all lg:truncate" title={email ?? undefined}>
            {email ?? 'Sesión iniciada'}
          </span>
        </div>
        <div className="flex shrink-0 flex-col gap-2 lg:flex-row lg:items-center">
          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            aria-label="Volver al dashboard"
            title="Volver al dashboard"
            className={buttonVariants({
              className:
                'text-surface-brand-deep lg:bg-surface-brand-deep lg:hover:bg-surface-brand-deep/90 h-11 w-full justify-start rounded-xl bg-white px-4 text-sm hover:bg-white/90 lg:h-7 lg:w-auto lg:justify-center lg:rounded-md lg:px-2 lg:text-xs lg:text-white',
            })}
          >
            <LayoutDashboard aria-hidden="true" />
            <span>Volver al dashboard</span>
          </Link>
          <form action={logout} className="w-full lg:w-auto">
            <Button
              type="submit"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="lg:bg-surface-brand-muted lg:text-foreground lg:hover:bg-surface-brand-muted/80 h-11 w-full justify-start rounded-xl bg-white/10 px-4 text-sm text-white hover:bg-white/20 lg:h-7 lg:w-auto lg:justify-center lg:rounded-md lg:px-2 lg:text-xs"
            >
              <LogOut aria-hidden="true" />
              <span>Cerrar sesión</span>
            </Button>
          </form>
        </div>
      </div>
    </nav>
  );
}
