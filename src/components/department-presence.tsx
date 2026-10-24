import { UruguayMapLoader } from '@/components/uruguay-map-loader';
import { getDepartmentProjectCounts } from '@/lib/projects/department-project-counts';

const MAX_DEPARTMENT_BUBBLES = 4;

export async function DepartmentPresence() {
  const departmentProjectCounts = await getDepartmentProjectCounts();
  const departmentsWithProjects = departmentProjectCounts.filter(({ total }) => total > 0);
  const departmentBubbles = departmentsWithProjects
    .slice(0, MAX_DEPARTMENT_BUBBLES)
    .map(({ department }) => department);
  const hiddenDepartments = departmentsWithProjects.length - MAX_DEPARTMENT_BUBBLES;
  if (hiddenDepartments > 0) departmentBubbles.push(`+ ${hiddenDepartments} más`);

  return (
    <div className="flex w-full flex-col items-center gap-8 lg:flex-row lg:gap-16">
      <div className="flex flex-col gap-4 text-left">
        <div className="flex max-w-105 flex-col gap-1">
          <h2 className="text-foreground text-2xl leading-8 font-bold tracking-normal sm:text-3xl sm:leading-9">
            Presencia en todo Uruguay
          </h2>
          <p className="text-foreground text-sm leading-5 font-normal tracking-normal">
            Nuestros proyectos llegan a {departmentsWithProjects.length} departamentos, priorizando
            comunidades con mayor vulnerabilidad social.
          </p>
        </div>
        <div className="flex max-w-105 flex-wrap gap-2">
          {departmentBubbles.map((department) => (
            <span
              key={department}
              className="bg-card text-foreground flex h-6.5 items-center rounded-[14px] px-2.5 py-1.25 text-xs leading-4 font-normal tracking-normal"
            >
              {department}
            </span>
          ))}
        </div>
      </div>
      <div className="h-80 w-full min-w-0 lg:h-107 lg:max-w-138 lg:flex-1">
        <UruguayMapLoader projectCounts={departmentProjectCounts} />
      </div>
    </div>
  );
}
