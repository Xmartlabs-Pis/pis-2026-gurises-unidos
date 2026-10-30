'use client';

import { useState } from 'react';
import { UruguayMapLoader } from '@/components/map/uruguay-map-loader';
import { ProjectCard } from '@/components/projects/project-card';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
} from '@/components/ui/carousel';
import type { PublicDepartment } from '@/lib/projects/public-projects';
import { formatNumber } from '@/lib/format';

function DepartmentCarouselControls() {
  const { canScrollPrev, canScrollNext } = useCarousel();

  if (!canScrollPrev && !canScrollNext) return null;

  return (
    <div className="flex shrink-0 gap-2">
      <CarouselPrevious className="static size-9 rounded-lg bg-white" />
      <CarouselNext className="static size-9 rounded-lg bg-white" />
    </div>
  );
}

export function DepartmentExplorer({
  year,
  departments,
}: {
  year: number;
  departments: PublicDepartment[];
}) {
  const [selectedName, setSelectedName] = useState(
    departments.find(({ name }) => name === 'Montevideo')?.name ??
      departments[0]?.name ??
      'Montevideo'
  );
  const selected = departments.find(({ name }) => name === selectedName);
  const projects = selected?.projects ?? [];
  const departmentsWithProjects = departments.filter(({ projects }) => projects.length > 0);
  const departmentCount = departmentsWithProjects.length;
  const projectCounts = departments.map(({ name, projects }) => ({
    department: name,
    total: projects.length,
  }));

  return (
    <div className="grid w-full items-center gap-14 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-20">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 className="text-foreground text-2xl leading-8 font-bold">Presencia en el Uruguay</h2>
          <p className="text-muted-foreground text-sm leading-5">
            Nuestros proyectos llegan a {departmentCount} departamentos, priorizando comunidades con
            mayor vulnerabilidad social.
          </p>
        </div>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por departamento">
          {departmentsWithProjects.map(({ id, name }) => (
            <button
              key={id}
              type="button"
              aria-pressed={name === selectedName}
              aria-controls="department-projects"
              onClick={() => setSelectedName(name)}
              className={`focus-visible:outline-primary rounded-full px-3 py-1.5 text-xs leading-4 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 ${name === selectedName ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-primary/20 bg-white'}`}
            >
              {name}
            </button>
          ))}
        </div>
        <div className="isolate h-90 w-full sm:h-110 lg:h-100">
          <UruguayMapLoader
            projectCounts={projectCounts}
            selectedDepartment={selectedName}
            onSelectDepartment={setSelectedName}
          />
        </div>
        <p className="text-muted-foreground text-center text-xs">
          Tocá un departamento para filtrar
        </p>
      </div>
      <div id="department-projects" className="min-w-0" aria-label="Proyectos por departamento">
        <Carousel
          key={selectedName}
          aria-label={`Proyectos en ${selectedName}`}
          className="flex flex-col gap-5"
        >
          <div className="flex min-h-9 items-center justify-between gap-4">
            <div
              className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
              aria-live="polite"
              aria-atomic="true"
            >
              <h3 className="text-foreground text-xl font-semibold">{selectedName}</h3>
              <span className="text-primary text-sm font-medium">
                {formatNumber(projects.length)} {projects.length === 1 ? 'proyecto' : 'proyectos'}
              </span>
            </div>
            <DepartmentCarouselControls />
          </div>
          {projects.length > 0 ? (
            <CarouselContent>
              {projects.map((project) => (
                <CarouselItem key={project.id} className="basis-72 sm:basis-76">
                  <ProjectCard
                    variant="public-light"
                    territory={selectedName}
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
              No hay proyectos publicados en {selectedName} para {year}.
            </div>
          )}
        </Carousel>
      </div>
    </div>
  );
}
