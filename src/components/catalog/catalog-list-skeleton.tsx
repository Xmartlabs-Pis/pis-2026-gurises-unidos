import { Skeleton } from '@/components/ui/skeleton';

export function CatalogListSkeleton() {
  return (
    <div
      aria-busy="true"
      className="bg-surface-page mx-auto flex w-full max-w-[1185px] flex-col gap-5 px-6 pt-6 pb-8"
    >
      <span className="sr-only">Cargando…</span>
      <div className="border-border bg-card flex w-full flex-col gap-4 rounded-[14px] border p-6">
        <Skeleton className="h-6 w-48" />
        <div className="flex w-full items-center gap-2">
          <Skeleton className="h-9 min-w-0 flex-1 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="bg-border h-px w-full" />
        <Skeleton className="h-3 w-20" />
        <ul className="w-full">
          {Array.from({ length: 6 }, (_, index) => (
            <li key={index} className="border-border border-b py-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-16" />
                <Skeleton className="hidden h-8 w-16 rounded-md lg:block" />
                <Skeleton className="hidden h-8 w-20 rounded-md lg:block" />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
