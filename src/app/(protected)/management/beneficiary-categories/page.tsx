import { BeneficiaryCategoriesManagement } from '@/components/beneficiary-categories/beneficiary-categories-management';
import { PageHeader } from '@/components/layout/page-header';
import { requireAdmin } from '@/lib/auth/require-admin';
import { getBeneficiaryCategoriesWithUsage } from '@/lib/beneficiary-categories';

export default async function BeneficiaryCategoriesPage() {
  await requireAdmin();

  const categories = await getBeneficiaryCategoriesWithUsage();

  return (
    <div className="bg-primary-foreground flex w-full flex-1 flex-col">
      <div className="flex w-full flex-1 flex-col">
        <PageHeader
          className="mx-auto w-full max-w-[1185px] px-6 pt-6 pb-2.5"
          eyebrow="Administración"
          title="Categorías de Beneficiarios"
          description="Categorías de Beneficiarios que se cargan en cada proyecto. Las del sistema alimentan las métricas públicas y no se pueden eliminar."
        />

        <div className="bg-surface-page mx-auto flex w-full max-w-[1185px] flex-col gap-5 px-6 pt-6 pb-8">
          <BeneficiaryCategoriesManagement categories={categories} />
        </div>
      </div>
    </div>
  );
}
