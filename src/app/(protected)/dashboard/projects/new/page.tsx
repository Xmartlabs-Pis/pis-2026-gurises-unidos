import { createProject } from '@/app/actions/projects';
import prisma from '@/lib/prisma';
import { getActiveBeneficiaryCategories } from '@/lib/beneficiary-categories';
import { requireUser } from '@/lib/auth/require-user';
import { ProjectForm } from '@/components/projects/form/project-form';
import { getRandomProjectPlaceholder } from '@/lib/projects/project-placeholders';

export default async function NewProjectPage() {
  const user = await requireUser();

  const [coordinators, departments, topics, strategicLines, beneficiaryCategories] =
    await Promise.all([
      prisma.user.findMany({
        where: {
          role: { in: ['coordinator', 'admin'] },
          status: 'active',
          deletedAt: null,
          ...(user.role === 'coordinator' ? { id: user.id } : {}),
        },
        orderBy: { firstName: 'asc' },
        select: { id: true, firstName: true, lastName: true },
      }),
      prisma.department.findMany({
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      prisma.topic.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      prisma.strategicLine.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
        select: { id: true, name: true },
      }),
      getActiveBeneficiaryCategories(),
    ]);

  return (
    <ProjectForm
      strategicLines={strategicLines}
      topics={topics}
      beneficiaryCategories={beneficiaryCategories}
      currentYear={new Date().getFullYear()}
      coordinators={coordinators}
      departments={departments}
      initialValues={{
        coverPhotoUrl: getRandomProjectPlaceholder(),
        leadCoordinatorId: user.role === 'coordinator' ? String(user.id) : '',
      }}
      submitAction={createProject}
      canSelectCoordinator={user.role === 'admin'}
    />
  );
}
