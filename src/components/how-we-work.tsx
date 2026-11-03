'use client';

import Image from 'next/image';
import { useId } from 'react';
import { useTimedSelection } from '@/hooks/use-timed-selection';
import { PROJECT_PLACEHOLDERS } from '@/lib/projects/project-placeholders';

const LEVELS = [
  {
    title: 'Individual',
    description: 'Niños, niñas, adolescentes y jóvenes: acompañamiento directo y personalizado.',
    image: PROJECT_PLACEHOLDERS[2],
    imageAlt: 'Niños y niñas jugando al fútbol junto a una educadora.',
  },
  {
    title: 'Familiar',
    description: 'La familia como unidad: fortalecimiento de vínculos y entornos protectores.',
    image: PROJECT_PLACEHOLDERS[0],
    imageAlt: 'Una adulta comparte una lectura con un grupo de niños y niñas.',
  },
  {
    title: 'Institucional',
    description: 'Escuelas, centros de salud e instituciones que rodean a cada gurí.',
    image: PROJECT_PLACEHOLDERS[3],
    imageAlt: 'Niños y niñas realizan actividades creativas con una educadora.',
  },
  {
    title: 'Comunitario',
    description: 'Territorios y comunidades donde se teje la red de protección.',
    image: PROJECT_PLACEHOLDERS[1],
    imageAlt: 'Un grupo de niños y niñas pinta un mural en su comunidad.',
  },
];

export function HowWeWork() {
  const imageClipId = useId();
  const { activeIndex, sectionRef, progressRef, selectIndex, handleKeyDown } = useTimedSelection(
    LEVELS.length
  );

  return (
    <div
      ref={sectionRef}
      className="mx-auto grid w-full max-w-360 lg:min-h-150 lg:grid-cols-[minmax(0,5fr)_minmax(0,3fr)]"
    >
      <figure
        id="work-level-panel"
        role="tabpanel"
        aria-labelledby={`work-level-${activeIndex}`}
        className="relative min-h-80 overflow-hidden sm:min-h-110 lg:min-h-full"
        style={{ clipPath: `url(#${imageClipId})` }}
      >
        {LEVELS.map((level, index) => (
          <Image
            key={level.title}
            src={level.image}
            alt={index === activeIndex ? level.imageAlt : ''}
            aria-hidden={index !== activeIndex}
            fill
            sizes="(min-width: 1440px) 900px, (min-width: 1024px) 63vw, 100vw"
            className={`object-cover transition-[opacity,transform] duration-700 motion-reduce:transition-none ${index === activeIndex ? 'scale-100 opacity-100' : 'scale-105 opacity-0'}`}
          />
        ))}
        <div
          aria-hidden="true"
          className="from-surface-brand-deep/80 pointer-events-none absolute inset-0 bg-linear-to-t via-transparent to-transparent"
        />
        <div
          aria-hidden="true"
          className="from-background via-background/40 pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b to-transparent sm:h-32"
        />
        <figcaption className="absolute inset-x-0 bottom-0 px-6 pt-12 pb-10 text-sm text-white sm:px-10">
          Acompañamiento {LEVELS[activeIndex].title.toLocaleLowerCase('es-UY')}
        </figcaption>
        <svg aria-hidden="true" width="0" height="0" className="pointer-events-none absolute">
          <defs>
            <clipPath id={imageClipId} clipPathUnits="objectBoundingBox">
              <path d="M0 0 H.99 Q1 .45 1 .985 Q.5 1.015 0 .955 Z" />
            </clipPath>
          </defs>
        </svg>
      </figure>
      <div className="flex min-w-0 flex-col gap-6 px-5 py-10 sm:px-6 lg:px-12 lg:py-14">
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col gap-2">
            <h2 className="text-foreground text-2xl leading-8 font-bold">Cómo trabajamos</h2>
            <p className="text-muted-foreground text-sm leading-5">
              Acompañamos en cuatro niveles que se potencian entre sí
            </p>
          </div>
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
              id={`work-level-${index}`}
              type="button"
              role="tab"
              aria-label={level.title}
              aria-selected={index === activeIndex}
              aria-controls="work-level-panel"
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => selectIndex(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className="border-border focus-visible:outline-foreground relative flex flex-col overflow-hidden rounded-lg border bg-white px-5 py-4 text-left transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              <span className="text-foreground text-xl leading-7 font-medium">{level.title}</span>
              <span
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
