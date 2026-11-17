import { Suspense } from 'react';
import { PartnersManagement } from '@/components/partners/partners-management';
import { CatalogListSkeleton } from '@/components/catalog/catalog-list-skeleton';
import { PageHeader } from '@/components/layout/page-header';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getManagedPartners } from '@/lib/partners';

export default async function PartnersPage() {
  await requireAdmin();

  return (
    <div className="bg-primary-foreground flex w-full flex-1 flex-col">
      <div className="flex w-full flex-1 flex-col">
        <PageHeader
          className="mx-auto w-full max-w-[1185px] px-6 pt-6 pb-2.5"
          eyebrow="Administración"
          title="Socios"
          description="Socios que se asocian a los proyectos."
        />

        <Suspense fallback={<CatalogListSkeleton />}>
          <PartnersContent />
        </Suspense>
      </div>
    </div>
  );
}

async function PartnersContent() {
  const partners = await getManagedPartners();

  return (
    <div className="bg-surface-page mx-auto flex w-full max-w-[1185px] flex-col gap-5 px-6 pt-6 pb-8">
      <PartnersManagement partners={partners} />
    </div>
  );
}
