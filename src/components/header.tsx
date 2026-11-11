'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';

export function Header() {
  const pathname = usePathname();
  const navigationRef = useRef<HTMLDivElement>(null);
  const [isNavigationHidden, setIsNavigationHidden] = useState(false);

  useEffect(() => {
    if (pathname !== '/') return;
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
      const headerTop = navigation.parentElement?.getBoundingClientRect().top ?? 0;
      const offset = Math.max(-height, Math.min(0, boundaryPosition - height - headerTop));
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
  }, [pathname]);

  return (
    <header className="pointer-events-none fixed inset-x-0 top-[var(--public-session-toolbar-height,0px)] z-60 text-white">
      {pathname === '/' && (
        <div className="overflow-hidden">
          <div
            ref={navigationRef}
            aria-hidden={isNavigationHidden}
            inert={isNavigationHidden}
            className={`bg-surface-brand-deep relative hidden h-16 will-change-transform lg:block ${isNavigationHidden ? 'pointer-events-none' : 'pointer-events-auto'}`}
          >
            <div className="relative mx-auto flex h-16 max-w-360 items-center justify-end gap-4 px-4 sm:px-6 lg:px-16">
              <nav className="hidden items-center gap-6 text-sm text-white/85 lg:flex">
                <Link href="#department-presence" className="hover:text-primary">
                  Proyectos
                </Link>
                <Link href="#how-we-work" className="hover:text-primary">
                  Cómo trabajamos
                </Link>
                <Link href="#mission" className="hover:text-primary">
                  Nuestra Misión
                </Link>
              </nav>
            </div>
          </div>
        </div>
      )}
      <Link
        href="/"
        className="pointer-events-auto fixed top-[var(--public-session-toolbar-height,0px)] left-0 z-10 block lg:top-0"
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
