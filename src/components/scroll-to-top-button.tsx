'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowUp } from 'lucide-react';

const SHOW_AFTER = '400px';

export function ScrollToTopButton() {
  const markerRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setIsVisible(!entry.isIntersecting));
    observer.observe(markerRef.current!);
    return () => observer.disconnect();
  }, []);

  function scrollToTop() {
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  }

  return (
    <>
      <div
        ref={markerRef}
        aria-hidden="true"
        className="pointer-events-none absolute top-0 w-px"
        style={{ height: SHOW_AFTER }}
      />
      {isVisible && (
        <Button
          size="icon"
          aria-label="Volver arriba"
          onClick={scrollToTop}
          className="bg-primary/90 fixed bottom-5 left-5 z-40 h-10 w-10 rounded-full shadow-md lg:right-8 lg:bottom-5 lg:left-auto"
        >
          <ArrowUp />
        </Button>
      )}
    </>
  );
}
