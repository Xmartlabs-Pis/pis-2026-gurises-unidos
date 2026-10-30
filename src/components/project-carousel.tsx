'use client';

import { useRef } from 'react';
import type { Project } from '@/lib/projects';
import { formatNumber } from '@/lib/format';

const INTENSITY_LABEL = {
  alta: 'Intensidad alta',
  media: 'Intensidad media',
  baja: 'Intensidad baja',
};

export function ProjectCarousel({ projects }: { projects: (Project & { reach: number })[] }) {
  const trackRef = useRef<HTMLUListElement>(null);

  function scrollByCards(direction: number) {
    const track = trackRef.current;
    if (!track) {
      return;
    }
    track.scrollBy({ left: direction * track.clientWidth * 0.8, behavior: 'smooth' });
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4">
        <h2 className="text-2xl font-semibold tracking-tight">Proyectos en curso</h2>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scrollByCards(-1)}
            aria-label="Ver proyectos anteriores"
            className="border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground grid h-9 w-9 place-items-center rounded-full border"
          >
            &#8592;
          </button>
          <button
            type="button"
            onClick={() => scrollByCards(1)}
            aria-label="Ver proyectos siguientes"
            className="border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground grid h-9 w-9 place-items-center rounded-full border"
          >
            &#8594;
          </button>
        </div>
      </div>
      <ul
        ref={trackRef}
        className="flex snap-x snap-mandatory [scrollbar-width:thin] gap-4 overflow-x-auto pb-4"
      >
        {projects.map((project) => (
          <li
            key={project.slug}
            className="border-border bg-card flex w-72 shrink-0 snap-start flex-col rounded-xl border p-5"
          >
            <p className="text-muted-foreground text-xs">
              {project.territory} · desde {project.startYear}
            </p>
            <h3 className="mt-2 text-lg leading-tight font-semibold">{project.name}</h3>
            <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
              {project.summary}
            </p>
            <div className="border-border mt-5 flex items-end justify-between border-t pt-3">
              <span className="text-muted-foreground text-xs">
                {INTENSITY_LABEL[project.intensity]}
              </span>
              <span className="text-xl font-semibold">
                {formatNumber(project.reach)}
                <span className="text-muted-foreground ml-1 text-xs font-normal">personas</span>
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
