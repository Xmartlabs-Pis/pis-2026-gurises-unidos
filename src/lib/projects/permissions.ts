import type { UserRole } from '@/generated/prisma/client';

export function canEditProject(
  user: { id: number; role: UserRole },
  project: { leadCoordinatorId: number }
) {
  return (
    user.role === 'admin' || (user.role === 'coordinator' && user.id === project.leadCoordinatorId)
  );
}
