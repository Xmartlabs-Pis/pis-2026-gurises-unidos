'use client';

import { ProjectCard } from '@/components/projects/project-card';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
} from '@/components/ui/carousel';
import type { PublicProject } from '@/lib/projects/public-projects';
import { formatNumber } from '@/lib/format';

function GeographyCarouselControls() {
  const { canScrollPrev, canScrollNext } = useCarousel();
  if (!canScrollPrev && !canScrollNext) return null;
  return (
    <div className="flex shrink-0 gap-2">
      <CarouselPrevious className="static size-9 rounded-lg bg-white" />
      <CarouselNext className="static size-9 rounded-lg bg-white" />
    </div>
  );
}

export function GeographyProjectCarousel({
  name,
  projects,
  emptyMessage,
  territory,
}: {
  name: string;
  projects: PublicProject[];
  emptyMessage: string;
  territory?: string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Carousel key={name} aria-label={`Proyectos en ${name}`} className="flex flex-col gap-5">
        <div className="flex min-h-9 items-start justify-between gap-4">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <h3 className="text-foreground text-xl font-semibold">{name}</h3>
            <span className="text-primary text-sm font-medium">
              {formatNumber(projects.length)} {projects.length === 1 ? 'proyecto' : 'proyectos'}
            </span>
          </div>
          <GeographyCarouselControls />
        </div>
        {projects.length > 0 ? (
          <CarouselContent>
            {projects.map((project) => (
              <CarouselItem key={project.id} className="basis-77">
                <ProjectCard
                  variant="public-light"
                  territory={territory ?? project.territory}
                  name={project.name}
                  description={project.description}
                  coverPhoto={project.coverPhoto}
                  reach={project.reach}
                />
              </CarouselItem>
            ))}
          </CarouselContent>
        ) : (
          <div className="border-border text-muted-foreground flex min-h-72 items-center justify-center rounded-xl border bg-white p-8 text-center text-sm">
            {emptyMessage}
          </div>
        )}
      </Carousel>
      <Button
        type="button"
        className="bg-surface-brand-deep hover:bg-surface-brand-deep/90 h-10 w-fit rounded-lg px-4 text-white"
      >
        Ver todos los proyectos
      </Button>
    </div>
  );
}
