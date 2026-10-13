import { auth } from '@/auth';
import { TopicsManagement } from '@/components/topics/topics-management';
import { ErrorScreen } from '@/components/error-screen';
import { PageHeader } from '@/components/layout/page-header';
import { getTopics } from '@/lib/topics';

export default async function TopicsPage() {
  const session = await auth();

  if (session?.user.role !== 'admin') {
    return <ErrorScreen code={403} />;
  }

  const topics = await getTopics();

  return (
    <div className="bg-primary-foreground flex w-full flex-1 flex-col">
      <div className="flex w-full flex-1 flex-col">
        <PageHeader
          className="mx-auto w-full max-w-[1185px] px-6 pt-6 pb-2.5"
          eyebrow="Administración"
          title="Temáticas"
          description="Etiquetas para clasificar los proyectos. Se usan en los filtros del dashboard y la vista pública."
        />

        <div className="bg-surface-page mx-auto flex w-full max-w-[1185px] flex-col gap-5 px-6 pt-6 pb-8">
          <TopicsManagement topics={topics} />
        </div>
      </div>
    </div>
  );
}
