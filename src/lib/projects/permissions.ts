import type { UserRole } from '@/generated/prisma/client';

export function canEditProject(
  user: { id: number; role: UserRole },
  project: { leadCoordinatorId: number }
) {
  return (
    user.role === 'admin' || (user.role === 'coordinator' && user.id === project.leadCoordinatorId)
  );
}

export const REPORT_ROLES: UserRole[] = ['admin', 'coordinator'];

export function canExportReports(user: { role: UserRole }) {
  return REPORT_ROLES.includes(user.role);
}

export function getReportProjectScope(user: { id: number; role: UserRole }) {
  return user.role === 'admin' ? {} : { leadCoordinatorId: user.id };
}

export function canExportProject(
  user: { id: number; role: UserRole },
  project: { leadCoordinatorId: number }
) {
  return canExportReports(user) && canEditProject(user, project);
}
