'use client';

import Image from 'next/image';
import { useId } from 'react';
import { useTimedSelection } from '@/hooks/use-timed-selection';
import { GeographyProjectCarousel } from '@/components/map/geography-project-carousel';
import type { PublicRegion } from '@/lib/projects/public-projects';

export function RegionExplorer({ regions, year }: { regions: PublicRegion[]; year: number }) {
  const id = useId();
  const { activeIndex, sectionRef, progressRef, selectIndex, handleKeyDown } = useTimedSelection(
    regions.length
  );
  const selected = regions[activeIndex];
  if (!selected) return null;

  return (
    <div
      ref={sectionRef}
      className="grid w-full items-start gap-14 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-28"
    >
      <div className="flex min-w-0 flex-col gap-6">
        <p className="text-muted-foreground text-sm leading-5">
          Trabajamos junto a comunidades y organizaciones de la región y otras geografías.
        </p>
        <div
          role="tablist"
          aria-label="Regiones de trabajo"
          aria-orientation="vertical"
          className="flex flex-col gap-4"
        >
          {regions.map((region, index) => (
            <button
              key={region.id}
              id={`${id}-${region.id}`}
              type="button"
              role="tab"
              aria-label={region.name}
              aria-selected={index === activeIndex}
              aria-controls={`${id}-projects`}
              tabIndex={index === activeIndex ? 0 : -1}
              onClick={() => selectIndex(index)}
              onKeyDown={(event) => handleKeyDown(event, index)}
              className={`border-border-default focus-visible:outline-foreground relative flex flex-col overflow-hidden rounded-[10px] border px-5 py-4 text-left transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 ${index === activeIndex ? 'bg-background' : 'bg-white'}`}
            >
              <Image
                src={region.image}
                alt=""
                aria-hidden="true"
                width={145}
                height={126}
                className={`pointer-events-none absolute top-0 -right-2 h-32 w-36 object-contain object-right-top transition-opacity duration-500 motion-reduce:transition-none ${index === activeIndex ? 'opacity-100' : 'opacity-0'}`}
              />
              <span className="text-foreground relative text-xl leading-7 font-medium">
                {region.name}
              </span>
              <span
                className={`relative grid transition-[grid-template-rows,opacity] duration-500 motion-reduce:transition-none ${index === activeIndex ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}
              >
                <span className="overflow-hidden">
                  <span className="text-muted-foreground block pt-3 pb-2 text-sm leading-5">
                    {region.description}
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
      <div
        id={`${id}-projects`}
        role="tabpanel"
        aria-labelledby={`${id}-${selected.id}`}
        className="min-w-0"
      >
        <GeographyProjectCarousel
          name={selected.name}
          projects={selected.projects}
          emptyMessage={`No hay proyectos asociados a ${selected.name} para ${year}.`}
        />
      </div>
    </div>
  );
}
