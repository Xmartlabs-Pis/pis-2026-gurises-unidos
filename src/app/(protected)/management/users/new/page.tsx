import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { UserForm } from '@/components/user-form';
import { ErrorScreen } from '@/components/error-screen';
import { PageHeader } from '@/components/layout/page-header';

export default async function NewUserPage() {
  const session = await auth();

  if (!session?.user) {
    redirect('/login');
  }

  if (session.user.role !== 'admin') {
    return <ErrorScreen code={403} />;
  }

  return (
    <div className="bg-primary-foreground flex w-full flex-1 flex-col">
      <div className="flex w-full flex-1 flex-col">
        <PageHeader
          className="mx-auto w-full max-w-[1185px] px-6 pt-6 pb-2.5"
          eyebrow="Administración"
          title="Nuevo usuario"
          description="Administrá el acceso de las personas que utilizan el sistema."
        />

        <div className="flex flex-1 flex-col">
          <UserForm />
        </div>
      </div>
    </div>
  );
}
