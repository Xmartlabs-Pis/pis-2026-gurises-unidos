import Link from 'next/link';
import { Menu } from 'lucide-react';
import { logout } from '@/app/actions/auth';
import { auth } from '@/auth';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import Image from 'next/image';
import logo from '@/assets/logo.png';

export async function Header() {
  const session = await auth();
  const projectsHref = '/dashboard/projects';

  return (
    <header className="bg-background sticky top-0 z-10">
      <div className="flex h-16 items-center justify-between px-4 md:px-16">
        <Link href="/" className="flex items-center gap-2 text-white">
          <Image
            src={logo}
            alt="Gurises Unidos"
            width={24}
            height={24}
            className="size-6 rounded"
          />
          <span className="text-base font-medium">Gurises Unidos</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-8 text-sm text-emerald-100 md:flex">
          {/* TODO: re-enable once the public landing content exists (Impacto 2026 / Sobre nosotros) */}
          {/* <Link href="#impacto" className="hover:text-white">
            Impacto 2026
          </Link>
          <Link href="#sobre-nosotros" className="hover:text-white">
            Sobre nosotros
          </Link> */}
          {session?.user ? (
            <>
              <Link href={projectsHref} className="hover:text-white">
                Proyectos
              </Link>
              <span className="text-xs text-emerald-300">{session.user.email}</span>
              <form action={logout}>
                <button
                  type="submit"
                  className="rounded-full border border-emerald-700 px-3.5 py-1.5 hover:border-emerald-400 hover:text-white"
                >
                  Cerrar sesión
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-white px-4 py-1.5 text-sm text-emerald-950 hover:opacity-90"
            >
              Iniciar sesión
            </Link>
          )}
        </nav>

        {/* Mobile nav */}
        <Sheet>
          <SheetTrigger className="text-white md:hidden" aria-label="Abrir menú">
            <Menu className="size-6" />
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>Menú</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-4 px-4 text-sm">
              {/* TODO: re-enable once the public landing content exists (Impacto 2026 / Sobre nosotros) */}
              {/* <SheetClose render={<Link href="#impacto" />}>Impacto 2026</SheetClose>
              <SheetClose render={<Link href="#sobre-nosotros" />}>Sobre nosotros</SheetClose> */}
              {session?.user ? (
                <>
                  <SheetClose nativeButton={false} render={<Link href={projectsHref} />}>
                    Proyectos
                  </SheetClose>
                  <span className="text-muted-foreground text-xs">{session.user.email}</span>
                  <form action={logout}>
                    <SheetClose
                      render={
                        <button
                          type="submit"
                          className="border-border rounded-full border px-3.5 py-1.5 text-left"
                        />
                      }
                    >
                      Cerrar sesión
                    </SheetClose>
                  </form>
                </>
              ) : (
                <SheetClose
                  nativeButton={false}
                  render={
                    <Link
                      href="/login"
                      className="bg-primary text-primary-foreground rounded-full px-4 py-1.5 text-center"
                    />
                  }
                >
                  Iniciar sesión
                </SheetClose>
              )}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
