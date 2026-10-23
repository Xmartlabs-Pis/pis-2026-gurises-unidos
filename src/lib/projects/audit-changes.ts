import type { Prisma } from '@/generated/prisma/client';

export const PROJECT_AUDIT_INCLUDE = {
  leadCoordinator: { select: { firstName: true, lastName: true } },
  topics: { select: { id: true, name: true }, orderBy: { id: 'asc' } },
  strategicLines: { select: { id: true, name: true }, orderBy: { id: 'asc' } },
  departments: { select: { id: true, name: true }, orderBy: { id: 'asc' } },
} satisfies Prisma.ProjectInclude;

type AuditProject = Prisma.ProjectGetPayload<{
  include: typeof PROJECT_AUDIT_INCLUDE;
}>;

function getAuditValue(project: AuditProject, field: string): Prisma.InputJsonValue | null {
  if (field === 'leadCoordinatorId') {
    return {
      id: project.leadCoordinatorId,
      name: `${project.leadCoordinator.firstName} ${project.leadCoordinator.lastName}`,
    };
  }

  if (field === 'topics' || field === 'strategicLines' || field === 'departments') {
    return project[field].map(({ id, name }) => ({ id, name }));
  }

  const value = project[field as keyof AuditProject];

  return value instanceof Date ? value.toISOString() : (value ?? null);
}

export function getProjectAuditChanges(
  previous: AuditProject,
  next: AuditProject,
  fields: string[]
) {
  return fields.map((field) => ({
    field,
    from: getAuditValue(previous, field),
    to: getAuditValue(next, field),
  }));
}