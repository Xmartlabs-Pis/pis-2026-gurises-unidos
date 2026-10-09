'use client';
import type { PublicProject } from '@/lib/projects/public-projects';
import { ProjectCard } from '@/components/projects/project-card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

type TopicCarouselProps = {
  topic: string;
  projects: PublicProject[];
};

export function TopicCarousel({ topic, projects }: TopicCarouselProps) {
  return (
    <Carousel className="flex flex-col gap-4">
      <div className="flex flex-row justify-between pr-16">
        <div className="flex flex-row items-center gap-3">
          <p className="text-foreground text-xl leading-7 font-semibold">{topic}</p>
          <p className="text-muted-foreground text-sm leading-5 font-normal">
            {projects.length == 1 ? '1 proyecto' : projects.length + ' proyectos'}{' '}
          </p>
        </div>
        <div className="flex flex-row gap-2">
          <CarouselPrevious className="static hidden h-9 w-9 gap-2.5 rounded-lg border bg-white shadow-xs/10 md:flex" />
          <CarouselNext className="static hidden h-9 w-9 gap-2.5 rounded-lg border bg-white shadow-xs/10 md:flex" />
        </div>
      </div>
      <CarouselContent>
        {projects.map((p) => (
          <CarouselItem key={p.id} className="basis-75 lg:basis-100">
            <ProjectCard
              variant="public-dark"
              territory={p.department}
              name={p.name}
              description={p.description}
              coverPhoto={p.coverPhoto}
              reach={p.reach}
            />
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}
