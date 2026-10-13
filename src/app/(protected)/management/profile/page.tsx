import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { PageHeader } from '@/components/layout/page-header';
import { ProfileForm } from '@/components/profile-form';
import prisma from '@/lib/prisma';

export default async function ProfilePage() {
  const session = await auth();
  const userId = Number(session?.user?.id);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    redirect('/login');
  }

  const profile = await prisma.user.findFirst({
    where: {
      id: userId,
      status: 'active',
      deletedAt: null,
    },
    select: {
      firstName: true,
      lastName: true,
      documentId: true,
      email: true,
      role: true,
      status: true,
      createdAt: true,
      lastAccess: true,
      updatedAt: true,
    },
  });

  if (!profile) {
    redirect('/login');
  }

  return (
    <div className="bg-primary-foreground flex w-full flex-1 flex-col">
      <PageHeader
        className="w-full px-4 pt-6 pb-2.5 sm:px-6"
        eyebrow="Cuenta"
        title="Mi perfil"
        description="Consultá y actualizá tus datos personales."
      />

      <ProfileForm profile={profile} />
    </div>
  );
}
