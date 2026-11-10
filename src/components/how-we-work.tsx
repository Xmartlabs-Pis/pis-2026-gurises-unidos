'use client';

import Image from 'next/image';
import { useId, useState, type CSSProperties } from 'react';
import { useTimedSelection } from '@/hooks/use-timed-selection';
import { TimedSelectionControl } from '@/components/timed-selection-control';
import workPhoto1 from '@/assets/how-we-work/how-we-work-1.webp';
import workPhoto2 from '@/assets/how-we-work/how-we-work-2.webp';
import workPhoto3 from '@/assets/how-we-work/how-we-work-3.webp';
import workPhoto4 from '@/assets/how-we-work/how-we-work-4.webp';
import workPhoto5 from '@/assets/how-we-work/how-we-work-5.webp';
import workPhoto6 from '@/assets/how-we-work/how-we-work-6.webp';
import workPhoto7 from '@/assets/how-we-work/how-we-work-7.webp';
import workPhoto8 from '@/assets/how-we-work/how-we-work-8.webp';

const LEVELS = [
  {
    title: 'Individual',
    photoNumbers: [8],
    description: 'Niños, niñas, adolescentes y jóvenes: acompañamiento directo y personalizado.',
  },
  {
    title: 'Familiar',
    photoNumbers: [1, 5],
    description: 'La familia como unidad: fortalecimiento de vínculos y entornos protectores.',
  },
  {
    title: 'Institucional',
    photoNumbers: [2, 3, 7],
    description: 'Escuelas, centros de salud e instituciones que rodean a cada gurí.',
  },
  {
    title: 'Comunitario',
    photoNumbers: [4, 6],
    description: 'Territorios y comunidades donde se teje la red de protección.',
  },
];

const PHOTOS = [
  { src: workPhoto1, alt: 'Jóvenes pintan un mural en grupo.' },
  {
    src: workPhoto2,
    alt: 'Jóvenes participan en una actividad deportiva en una cancha cubierta.',
  },
  {
    src: workPhoto3,
    alt: 'Niños y niñas juegan al fútbol al aire libre.',
  },
  {
    src: workPhoto4,
    alt: 'Participantes de una jornada grupal se reúnen en un espacio verde.',
  },
  {
    src: workPhoto5,
    alt: 'Niños y niñas pintan juntos sobre una superficie compartida.',
  },
  {
    src: workPhoto6,
    alt: 'Un grupo posa en una estructura de madera entre los árboles.',
  },
  {
    src: workPhoto7,
    alt: 'Niños, niñas y adultos celebran una actividad al aire libre con papel picado.',
  },
  {
    src: workPhoto8,
    alt: 'Una niña dibuja con lápices de colores en una mesa.',
  },
];

export function HowWeWork() {
  const imageClipId = useId();
  const [displayedPhoto, setDisplayedPhoto] = useState<{
    currentIndex: number;
    previousIndex: number | null;
    loadedIndices: Set<number>;
  }>({
    currentIndex: LEVELS[0].photoNumbers[0] - 1,
    previousIndex: null,
    loadedIndices: new Set(),
  });
  const [selection, setSelection] = useState({
    activeIndex: 0,
    photoPositions: LEVELS.map(() => 0),
  });
  const {
    activeIndex,
    sectionRef,
    progressRef,
    selectIndex,
    handleKeyDown,
    hoverPauseProps,
    isPaused,
    togglePause,
  } = useTimedSelection(LEVELS.length);

  if (selection.activeIndex !== activeIndex) {
    setSelection({
      activeIndex,
      photoPositions: selection.photoPositions.map((position, index) =>
        index === selection.activeIndex
          ? (position + 1) % LEVELS[index].photoNumbers.length
          : position
      ),
    });
  }

  const photoIndex = LEVELS[activeIndex].photoNumbers[selection.photoPositions[activeIndex]] - 1;

  if (displayedPhoto.loadedIndices.has(photoIndex) && photoIndex !== displayedPhoto.currentIndex) {
    setDisplayedPhoto({
      ...displayedPhoto,
      currentIndex: photoIndex,
      previousIndex: displayedPhoto.currentIndex,
    });
  }

  return (
    <div
      ref={sectionRef}
      className="relative mx-auto grid w-full max-w-360 lg:min-h-150 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]"
    >
      <div
        id="work-level-panel"
        role="tabpanel"
        aria-labelledby={`work-level-${activeIndex}`}
        className="absolute inset-x-0 top-0 h-48 overflow-hidden [clip-path:var(--work-image-mobile-clip)] sm:h-64 lg:relative lg:h-auto lg:min-h-full lg:[clip-path:var(--work-image-desktop-clip)]"
        style={
          {
            '--work-image-mobile-clip': `url(#${imageClipId}-mobile)`,
            '--work-image-desktop-clip': `url(#${imageClipId})`,
          } as CSSProperties
        }
      >
        {PHOTOS.map((photo, index) =>
          index === photoIndex ||
          index === displayedPhoto.currentIndex ||
          index === displayedPhoto.previousIndex ? (
            <Image
              key={index}
              src={photo.src}
              alt={index === photoIndex ? photo.alt : ''}
              aria-hidden={index !== photoIndex}
              fill
              sizes="(min-width: 1440px) 900px, (min-width: 1024px) 63vw, 100vw"
              onLoad={() => {
                setDisplayedPhoto((current) =>
                  current.loadedIndices.has(index)
                    ? current
                    : { ...current, loadedIndices: new Set([...current.loadedIndices, index]) }
                );
              }}
              className={`object-cover object-top transition-[opacity,transform] duration-700 motion-reduce:transition-none lg:object-center ${index === displayedPhoto.currentIndex ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}
            />
          ) : null
        )}
        <div
          aria-hidden="true"
          className="from-surface-brand-deep/80 pointer-events-none absolute inset-0 hidden bg-linear-to-t via-transparent to-transparent lg:block"
        />
        <div
          aria-hidden="true"
          className="from-background via-background/40 pointer-events-none absolute inset-x-0 top-0 hidden h-32 bg-linear-to-b to-transparent lg:block"
        />
        <div
          aria-hidden="true"
          className="via-background/95 to-background pointer-events-none absolute inset-0 bg-linear-to-b from-transparent from-30% via-80% lg:hidden"
        />
        <figcaption className="absolute inset-x-0 bottom-0 hidden px-6 pt-12 pb-10 text-sm text-white sm:px-10 lg:block">
          Acompañamiento {LEVELS[activeIndex].title.toLocaleLowerCase('es-UY')}
        </figcaption>
        <svg aria-hidden="true" width="0" height="0" className="pointer-events-none absolute">
          <defs>
            <clipPath id={`${imageClipId}-mobile`} clipPathUnits="objectBoundingBox">
              <path d="M0 .18 Q.5 0 1 0 V1 H0 Z" />
            </clipPath>
            <clipPath id={imageClipId} clipPathUnits="objectBoundingBox">
              <path d="M0 0 H.99 Q1 .45 1 .985 Q.5 1.015 0 .955 Z" />
            </clipPath>
          </defs>
        </svg>
      </div>
      <div className="pointer-events-none relative flex min-w-0 flex-col gap-6 px-6 pt-28 pb-10 sm:pt-40 lg:pointer-events-auto lg:px-12 lg:py-14">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <h2 className="text-foreground text-2xl leading-8 font-bold">Cómo trabajamos</h2>
            <p className="text-muted-foreground text-sm leading-5">
              Acompañamos en cuatro niveles que se potencian entre sí
            </p>
          </div>
          <TimedSelectionControl
            isPaused={isPaused}
            onToggle={togglePause}
            label="Cómo trabajamos"
          />
        </div>
        <div
          role="tablist"
          aria-label="Niveles de acompañamiento"
          aria-orientation="vertical"
          className="flex flex-col gap-4"
        >
          {LEVELS.map((level, index) => (
            <button
              key={level.title}
              {...hoverPauseProps}
              data-timed-selection-pause={index === activeIndex ? '' : undefined}
              id={`work-level-${index}`}
              type="button"
              role="tab"
              aria-selected={index === activeIndex}
              aria-controls="work-level-panel"
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => selectIndex(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`border-border focus-visible:outline-foreground pointer-events-auto relative flex flex-col overflow-hidden rounded-lg border px-5 py-4 text-left transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 ${index === activeIndex ? 'bg-background lg:bg-white' : 'bg-white'}`}
            >
              <span className="lg:text-foreground text-xl leading-7 font-medium text-neutral-950">
                {level.title}
              </span>
              <span
                aria-hidden={index !== activeIndex}
                className={`grid transition-[grid-template-rows,opacity] duration-500 motion-reduce:transition-none ${index === activeIndex ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
              >
                <span className="overflow-hidden">
                  <span className="text-muted-foreground block pt-3 pb-2 text-sm leading-5">
                    {level.description}
                  </span>
                </span>
              </span>
              {index === activeIndex && (
                <span
                  aria-hidden="true"
                  className="bg-foreground/15 absolute inset-x-0 bottom-0 h-1"
                >
                  <span
                    ref={progressRef}
                    className="bg-foreground block h-full origin-left"
                    style={{ transform: 'scaleX(0)' }}
                  />
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
