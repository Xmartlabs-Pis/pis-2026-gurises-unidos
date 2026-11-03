'use client';

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
import { useEffect, useRef, useState } from 'react';

export function Header() {
  const navigationRef = useRef<HTMLDivElement>(null);
  const [isNavigationHidden, setIsNavigationHidden] = useState(false);

  useEffect(() => {
    let frameId = 0;
    function updateVisibility() {
      const navigation = navigationRef.current;
      const boundary =
        document.querySelector('.public-hero-stats') ?? document.querySelector('.public-hero');
      if (!navigation || !boundary) return;
      const boundaryPosition = boundary.classList.contains('public-hero-stats')
        ? boundary.getBoundingClientRect().top
        : boundary.getBoundingClientRect().bottom;
      const height = navigation.offsetHeight;
      const offset = Math.max(-height, Math.min(0, boundaryPosition - height));
      navigation.style.transform = `translate3d(0, ${offset}px, 0)`;
      setIsNavigationHidden(offset <= -height);
    }
    function scheduleUpdate() {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateVisibility);
    }
    const observer = new ResizeObserver(scheduleUpdate);
    const main = document.querySelector('main');
    if (main) observer.observe(main);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();
    return () => {
      cancelAnimationFrame(frameId);
      observer.disconnect();
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 text-white">
      <div
        ref={navigationRef}
        aria-hidden={isNavigationHidden}
        inert={isNavigationHidden}
        className={`bg-surface-brand-deep relative h-16 will-change-transform ${isNavigationHidden ? 'pointer-events-none' : 'pointer-events-auto'}`}
      >
        <div className="relative mx-auto flex h-16 max-w-360 items-center justify-end gap-4 px-4 sm:px-6 lg:px-16">
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
        </div>

        {/* Mobile nav */}
        <Sheet>
          <SheetTrigger
            className="absolute top-5 right-4 text-white sm:right-6 lg:hidden"
            aria-label="Abrir menú"
          >
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
      <Link
        href="/"
        className="pointer-events-auto absolute top-0 left-0 z-10 block"
        aria-label="Gurises Unidos, inicio"
      >
        <Image
          src="/images/gurises-unidos-logo.svg"
          alt="Gurises Unidos"
          width={275}
          height={94}
          className="h-auto w-55 sm:w-68.75"
        />
      </Link>
    </header>
  );
}
