import Link from 'next/link';
import { ExportPdfButton } from '@/components/reports/export-pdf-button';
import { Button } from '@/components/ui/button';

export function DashboardQuickActions({ reportHref }: { reportHref: string }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        className="h-9 rounded-[10px] px-4"
        nativeButton={false}
        render={<Link href="/dashboard/projects/new" />}
      >
        Nuevo proyecto
      </Button>
      <ExportPdfButton
        href={reportHref}
        label="Exportar reporte"
        className="h-9 rounded-[10px] px-4"
      />
      <Button variant="outline" className="h-9 rounded-[10px] px-4" disabled>
        Publicar dashboard
      </Button>
    </div>
  );
}
