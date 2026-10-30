import Link from 'next/link';
import { Menu } from 'lucide-react';
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

export function Header() {
  return (
    <header className="bg-surface-brand-deep fixed inset-x-0 top-0 z-40 text-white">
      <div className="mx-auto flex h-16 max-w-360 items-center justify-between gap-4 px-4 sm:px-6 lg:px-16">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-white">
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
        <nav className="hidden items-center gap-6 text-sm text-white/85 lg:flex">
          <a href="#department-presence" className="hover:text-primary">
            Proyectos
          </a>
          <a href="#how-we-work" className="hover:text-primary">
            Cómo trabajamos
          </a>
          <a href="#mission" className="hover:text-primary">
            Nuestra Misión
          </a>
        </nav>

        {/* Mobile nav */}
        <Sheet>
          <SheetTrigger className="text-white lg:hidden" aria-label="Abrir menú">
            <Menu className="size-6" />
          </SheetTrigger>
          <SheetContent side="right" className="theme-public w-72">
            <SheetHeader>
              <SheetTitle>Menú</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-4 px-4 text-sm">
              <SheetClose nativeButton={false} render={<a href="#department-presence" />}>
                Proyectos
              </SheetClose>
              <SheetClose nativeButton={false} render={<a href="#how-we-work" />}>
                Cómo trabajamos
              </SheetClose>
              <SheetClose nativeButton={false} render={<a href="#mission" />}>
                Nuestra Misión
              </SheetClose>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
}
