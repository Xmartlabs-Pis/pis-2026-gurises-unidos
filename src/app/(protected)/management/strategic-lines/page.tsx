import { auth } from '@/auth';
import { StrategicLinesManagement } from '@/components/strategic-lines/strategic-lines-management';
import { ErrorScreen } from '@/components/error-screen';
import { PageHeader } from '@/components/layout/page-header';
import { getStrategicLines } from '@/lib/strategic-lines';

export default async function StrategicLinesPage() {
  const session = await auth();

  if (session?.user.role !== 'admin') {
    return <ErrorScreen code={403} />;
  }

  const strategicLines = await getStrategicLines();

  return (
    <div className="bg-primary-foreground flex w-full flex-1 flex-col">
      <div className="flex w-full flex-1 flex-col">
        <PageHeader
          className="mx-auto w-full max-w-[1185px] px-6 pt-6 pb-2.5"
          eyebrow="Administración"
          title="Líneas Estratégicas"
          description="Etiquetas para clasificar los proyectos."
        />

        <div className="bg-surface-page mx-auto flex w-full max-w-[1185px] flex-col gap-5 px-6 pt-6 pb-8">
          <StrategicLinesManagement lines={strategicLines} />
        </div>
      </div>
    </div>
  );
}
