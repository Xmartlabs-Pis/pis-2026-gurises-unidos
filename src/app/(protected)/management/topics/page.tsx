import { Suspense } from 'react';
import { TopicsManagement } from '@/components/topics/topics-management';
import { CatalogListSkeleton } from '@/components/catalog/catalog-list-skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getTopics } from '@/lib/topics';

export default async function TopicsPage() {
  await requireAdmin();

  return (
    <div className="bg-primary-foreground flex w-full flex-1 flex-col">
      <div className="flex w-full flex-1 flex-col">
        <PageHeader
          className="mx-auto w-full max-w-[1185px] px-6 pt-6 pb-2.5"
          eyebrow="Administración"
          title="Temáticas"
          description="Etiquetas para clasificar los proyectos. Se usan en los filtros del dashboard y la vista pública."
        />

        <Suspense fallback={<CatalogListSkeleton />}>
          <TopicsContent />
        </Suspense>
      </div>
    </div>
  );
}

async function TopicsContent() {
  const topics = await getTopics();

  return (
    <div className="bg-surface-page mx-auto flex w-full max-w-[1185px] flex-col gap-5 px-6 pt-6 pb-8">
      <TopicsManagement topics={topics} />
    </div>
  );
}
