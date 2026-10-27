'use client';

import { useEffect, useRef, type ReactNode } from 'react';

export function PublicHeaderSurface({ children }: { children: ReactNode }) {
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const header = headerRef.current;
    const main = header?.parentElement?.querySelector('main');
    if (!header || !main) return;

    let frameId = 0;

    function updateBackground() {
      if (!header || !main) return;
      const headerBottom = header.getBoundingClientRect().bottom;
      const section = Array.from(main.children).find((element) => {
        const bounds = element.getBoundingClientRect();
        return bounds.top <= headerBottom && bounds.bottom > headerBottom;
      });
      header.style.backgroundColor = getComputedStyle(section ?? main).backgroundColor;
    }

    function scheduleUpdate() {
      cancelAnimationFrame(frameId);
      frameId = requestAnimationFrame(updateBackground);
    }

    const resizeObserver = new ResizeObserver(scheduleUpdate);
    resizeObserver.observe(main);
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate);
    scheduleUpdate();

    return () => {
      cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener('scroll', scheduleUpdate);
      window.removeEventListener('resize', scheduleUpdate);
    };
  }, []);

  return (
    <header ref={headerRef} className="bg-background fixed inset-x-0 top-0 z-40">
      {children}
    </header>
  );
}
