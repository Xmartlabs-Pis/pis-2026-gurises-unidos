import { cn } from 'cn';
import { Skeleton } from '@/components/ui/skeleton';

function KpiSkeleton({ className, featured = false }: { className?: string; featured?: boolean }) {
  return (
    <div
      className={cn(
        'bg-card border-border min-w-0 rounded-[14px] border p-4 sm:p-6',
        featured && 'shadow-sm',
        className
      )}
    >
      <Skeleton className={featured ? 'h-10 w-28 sm:h-12' : 'h-8 w-20 sm:h-9'} />
      <Skeleton className="mt-2 h-4 w-36" />
      <Skeleton className="mt-2 h-4 w-24" />
    </div>
  );
}

function OverviewRow() {
  return (
    <div className="flex items-center gap-4 px-4 py-3">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="h-5.5 w-16 rounded-lg" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="ml-auto h-4 w-12" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      aria-busy="true"
      className="bg-surface-page flex flex-1 flex-col gap-4 p-4 lg:px-6 lg:py-5"
    >
      <span className="sr-only">Cargando…</span>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-9 w-36 rounded-[10px]" />
          <Skeleton className="h-9 w-36 rounded-[10px]" />
          <Skeleton className="h-9 w-40 rounded-[10px]" />
        </div>
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      <KpiSkeleton featured />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <KpiSkeleton />
        <KpiSkeleton />
        <KpiSkeleton className="col-span-2 md:col-span-1" />
      </div>

      <div className="bg-card border-border overflow-hidden rounded-[14px] border">
        <div className="flex flex-col gap-3 p-4 lg:hidden">
          {Array.from({ length: 3 }, (_, index) => (
            <div
              key={index}
              className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl p-4 ring-1"
            >
              <div className="flex items-center justify-between gap-3">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-5.5 w-16 rounded-lg" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-5 w-10" />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden lg:block">
          <div className="bg-muted grid grid-cols-4 gap-4 px-4 py-2.5">
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-20" />
            <Skeleton className="ml-auto h-3 w-24" />
          </div>
          <div className="divide-border divide-y">
            {Array.from({ length: 6 }, (_, index) => (
              <OverviewRow key={index} />
            ))}
          </div>
        </div>

        <div className="border-border bg-surface-page flex flex-col gap-1 border-t px-4 py-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-12" />
          </div>
          <Skeleton className="h-3 w-64" />
        </div>
      </div>
    </div>
  );
}
