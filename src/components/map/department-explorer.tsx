'use client';

import { useState } from 'react';
import { UruguayMapLoader } from '@/components/map/uruguay-map-loader';
import { GeographyProjectCarousel } from '@/components/map/geography-project-carousel';
import type { PublicDepartment } from '@/lib/projects/public-projects';

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
    <div className="grid w-full items-start gap-14 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-28">
      <div className="flex min-w-0 flex-col gap-5">
        <div className="flex flex-col gap-2">
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
      <div
        id="department-projects"
        className="flex min-w-0 flex-col gap-6"
        aria-label="Proyectos por departamento"
      >
        <GeographyProjectCarousel
          name={selectedName}
          projects={projects}
          territory={selectedName}
          emptyMessage={`No hay proyectos publicados en ${selectedName} para ${year}.`}
        />
      </div>
    </div>
  );
}
