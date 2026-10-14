import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import prisma from '@/lib/prisma';
import { formatDate, formatUserDate } from '@/lib/users/format';
import { UserForm } from '@/components/user-form';
import { ErrorScreen } from '@/components/error-screen';
import { PageHeader } from '@/components/layout/page-header';

export default async function EditUserPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'admin') {
    return <ErrorScreen code={403} />;
  }

  const { id } = await params;
  const userId = Number(id);

  if (!Number.isInteger(userId) || userId <= 0) {
    notFound();
  }

  if (userId === Number(session.user.id)) {
    redirect('/management/profile');
  }

  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      documentId: true,
      email: true,
      role: true,
      status: true,
      lastAccess: true,
      createdAt: true,
      updatedAt: true,
      creator: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });

  if (!user) {
    notFound();
  }

  const creatorName = user.creator ? `${user.creator.firstName} ${user.creator.lastName}` : '—';

  return (
    <div className="bg-primary-foreground flex w-full flex-1 flex-col">
      <div className="flex w-full flex-1 flex-col">
        <PageHeader
          className="mx-auto w-full max-w-[1185px] px-6 pt-6 pb-2.5"
          eyebrow="Administración"
          title="Editar usuario"
          description="Administrá el acceso de las personas que utilizan el sistema."
        />

        <div className="flex flex-1 flex-col">
          <UserForm
            key={user.id}
            mode="edit"
            initialValues={{
              id: user.id,
              firstName: user.firstName,
              lastName: user.lastName,
              documentId: user.documentId,
              email: user.email,
              role: user.role,
              status: user.status,
              information: {
                createdAt: formatUserDate(user.createdAt),
                lastAccess: formatDate(user.lastAccess),
                createdBy: creatorName,
                updatedAt: formatUserDate(user.updatedAt),
              },
            }}
          />
        </div>
      </div>
    </div>
  );
}
