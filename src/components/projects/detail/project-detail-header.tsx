import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { INTENSITY_LABEL, STATUS_LABEL } from '@/lib/project-display';
import { STATUS_BADGE_VARIANT } from '@/lib/projects/constants';
import type { ProjectDetail } from '@/lib/projects/detail';
import { getLocationLabel } from '@/lib/projects/location';
import { ProjectYearSelector } from './project-year-selector';

type ProjectDetailHeaderProps = {
  project: ProjectDetail['project'];
  selectedYear: number;
  years: number[];
  canEdit: boolean;
};

function ProjectBadges({ project }: { project: ProjectDetail['project'] }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={STATUS_BADGE_VARIANT[project.status]}>{STATUS_LABEL[project.status]}</Badge>
      {project.intensity && (
        <Badge variant="neutral">{INTENSITY_LABEL[project.intensity]} intensidad</Badge>
      )}
    </div>
  );
}

function ProjectMetadata({
  territory,
  coordinator,
  period,
  strategicLines,
}: {
  territory: string;
  coordinator: string;
  period: string;
  strategicLines: string;
}) {
  const rows = [
    { label: 'Territorio:', value: territory },
    { label: 'Coordinador/a:', value: coordinator },
    { label: 'Período:', value: period },
  ];

  return (
    <dl className="text-muted-foreground mt-3 flex flex-col gap-1.5 text-sm sm:flex-row sm:flex-wrap sm:gap-x-4">
      {rows.map(({ label, value }) => (
        <div key={label} className="flex items-center gap-1.5">
          <span aria-hidden="true" className="hidden sm:inline">
            •
          </span>
          <dt>{label}</dt>
          <dd className="text-foreground/80 sm:text-foreground/65">{value}</dd>
        </div>
      ))}
      <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline">
        <span aria-hidden="true" className="hidden sm:inline">
          •
        </span>
        <dt className="whitespace-nowrap">Líneas estratégicas:</dt>
        <dd className="text-foreground/80 sm:text-foreground/65">{strategicLines}</dd>
      </div>
    </dl>
  );
}

export function ProjectDetailHeader({
  project,
  selectedYear,
  years,
  canEdit,
}: ProjectDetailHeaderProps) {
  const territory = getLocationLabel(project);
  const coordinator = `${project.leadCoordinator.firstName} ${project.leadCoordinator.lastName}`;
  const period = `${project.startYear}–${project.endYear ?? 'actualidad'}`;
  const strategicLines = project.strategicLines.map(({ name }) => name).join(', ');
  const description = project.generalObjective ?? project.publicDescription;

  return (
    <section className="border-border pb-1 sm:border-b sm:pb-5">
      <p className="text-muted-foreground text-xs font-medium sm:hidden">Proyectos</p>
      <div className="mt-0.5 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 sm:mt-0 sm:flex sm:justify-between sm:gap-4">
        <div className="contents sm:flex sm:min-w-0 sm:flex-wrap sm:items-center sm:gap-2.5">
          <h1 className="col-start-1 row-start-1 min-w-0 text-2xl leading-8 font-bold tracking-tight">
            {project.name}
          </h1>
          <div className="col-span-2 row-start-2 mt-3 sm:mt-0">
            <ProjectBadges project={project} />
          </div>
        </div>

        <div className="col-start-2 row-start-1 flex shrink-0 items-center justify-end gap-2">
          {canEdit && (
            <Link
              href={`/dashboard/projects/${project.id}/edit`}
              className={buttonVariants({
                variant: 'outline',
                size: 'lg',
                className: 'h-9 px-4 shadow-sm',
              })}
            >
              Editar proyecto
            </Link>
          )}
        </div>
      </div>

      <div className="flex flex-col">
        {description && (
          <p className="text-muted-foreground order-1 mt-3 max-w-4xl text-sm leading-5 sm:order-2">
            {description}
          </p>
        )}
        <div className="order-2 sm:order-1">
          <ProjectMetadata
            territory={territory}
            coordinator={coordinator}
            period={period}
            strategicLines={strategicLines}
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 md:hidden">
        <span className="text-muted-foreground text-sm">Año de los datos</span>
        <ProjectYearSelector year={selectedYear} years={years} />
      </div>
    </section>
  );
}
