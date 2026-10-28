import { ProjectHistory } from '@/components/projects/form/project-history';
import { STATUS_LABEL, INTENSITY_LABEL } from '@/lib/project-display';
import { forbidden, notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/require-user';
import { canEditProject } from '@/lib/projects/permissions';
import { getProjectHistory } from '@/lib/projects/history';
import { parseId } from '@/lib/validation/ids';
import { updateProject } from '@/app/actions/projects';
import { ProjectForm } from '@/components/projects/form/project-form';
import { projectToFormValues } from '@/components/projects/form/project-to-form-values';
import prisma from '@/lib/prisma';
import { ASSIGNABLE_LEAD_COORDINATOR_WHERE } from '@/lib/projects/constants';
import {
  getActiveBeneficiaryCategories,
  getBeneficiaryCategoryLabels,
} from '@/lib/beneficiary-categories';
import { BENEFICIARY_VALUES_SELECT, toBeneficiaryCounts } from '@/lib/projects/beneficiary-values';
import { DeleteProjectSection } from '@/components/projects/delete-project-section';
import { BreadcrumbResourceLabel } from '@/components/layout/topbar-context';

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();

  const { id } = await params;
  const projectId = parseId(id);

  if (!projectId) {
    notFound();
  }

  const project = await prisma.project.findFirst({
    where: { id: projectId, deletedAt: null },
    include: {
      topics: { select: { id: true } },
      strategicLines: { select: { id: true } },
      departments: { select: { id: true } },
      projectBeneficiaries: {
        orderBy: { year: 'desc' },
        select: { id: true, year: true, ...BENEFICIARY_VALUES_SELECT },
      },
    },
  });

  if (!project) {
    notFound();
  }

  if (!canEditProject(user, project)) forbidden();
  const currentYear = new Date().getFullYear();

  const [
    coordinators,
    departments,
    history,
    topics,
    strategicLines,
    beneficiaryCategories,
    fieldLabels,
  ] = await Promise.all([
    prisma.user.findMany({
      where: {
        OR: [ASSIGNABLE_LEAD_COORDINATOR_WHERE, { id: project.leadCoordinatorId }],
      },
      orderBy: { firstName: 'asc' },
      select: { id: true, firstName: true, lastName: true },
    }),
    prisma.department.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true } }),
    getProjectHistory(project.id, project.projectBeneficiaries.map(({ id }) => id)),
    prisma.topic.findMany({
      where: {
        OR: [{ isActive: true }, { id: { in: project.topics.map(({ id }) => id) } }],
      },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    prisma.strategicLine.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
    getActiveBeneficiaryCategories(),
    getBeneficiaryCategoryLabels(),
  ]);

  const beneficiaryRecords = project.projectBeneficiaries.map(({ year, values }) => ({
    year,
    ...toBeneficiaryCounts(values),
  }));
  const submitAction = updateProject.bind(null, project.id);

  return (
    <div className="bg-surface-page flex min-h-0 w-full flex-1 flex-col">
      <BreadcrumbResourceLabel label={project.name} />
      <div className="mx-auto flex w-full max-w-[1185px] min-w-0 flex-col items-start gap-1.5 px-4 pt-6 pb-2.5 sm:px-6">
        <p className="text-muted-foreground text-sm">Editar proyecto</p>
        <h1 className="text-3xl leading-9 font-bold">{project.name}</h1>
        <div className="text-muted-foreground flex items-center gap-1.5 text-sm leading-5">
          <span
            className={
              project.status === 'active'
                ? 'bg-status-success size-2 rounded-full'
                : 'bg-muted-foreground size-2 rounded-full'
            }
          />
          <span className={project.status === 'active' ? 'text-status-success' : undefined}>
            {STATUS_LABEL[project.status]}
          </span>
          {project.intensity && (
            <>
              <span className="text-muted-foreground">•</span>
              <span>{INTENSITY_LABEL[project.intensity]} intensidad</span>
            </>
          )}
        </div>
      </div>
      <ProjectForm
        key={project.id}
        mode="edit"
        initialValues={projectToFormValues(
          { ...project, projectBeneficiaries: beneficiaryRecords },
          currentYear,
          beneficiaryCategories
        )}
        beneficiaryRecords={beneficiaryRecords}
        strategicLines={strategicLines}
        beneficiaryCategories={beneficiaryCategories}
        topics={topics}
        currentYear={currentYear}
        coordinators={coordinators}
        departments={departments}
        cancelHref={`/dashboard/projects/${project.id}`}
        submitAction={submitAction}
        canSelectCoordinator={user.role === 'admin'}
      >
        <ProjectHistory entries={history} fieldLabels={fieldLabels} />
        <DeleteProjectSection projectId={project.id} />
      </ProjectForm>
    </div>
  );
}
