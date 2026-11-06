import { Card, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

function TableRowSkeleton() {
  return (
    <div className="grid h-15 grid-cols-[14rem_8rem_9.5rem_9.5rem_11rem_auto] items-center gap-4 px-4">
      <Skeleton className="h-4 w-36" />
      <Skeleton className="h-4 w-28" />
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-5.5 w-16 rounded-lg" />
      <Skeleton className="h-4 w-20" />
      <Skeleton className="ml-auto size-8 rounded-md" />
    </div>
  );
}

export function UsersListSkeleton() {
  return (
    <div
      aria-busy="true"
      className="flex w-full flex-1 flex-col gap-5 px-4 pt-6 pb-8 sm:px-6 xl:min-h-0"
    >
      <span className="sr-only">Cargando…</span>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-9 w-12" />
              <Skeleton className="h-4 w-32" />
            </CardHeader>
          </Card>
        ))}
      </div>

      <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center gap-2 xl:w-auto">
          <Skeleton className="h-9 min-w-0 flex-1 rounded-md sm:w-80 sm:flex-none" />
          <Skeleton className="hidden h-9 w-36 rounded-md xl:block" />
          <Skeleton className="hidden h-9 w-40 rounded-md xl:block" />
          <Skeleton className="hidden h-9 w-36 rounded-md xl:block" />
          <Skeleton className="h-9 w-20 rounded-md xl:hidden" />
        </div>
        <Skeleton className="hidden h-4 w-24 md:block" />
      </div>

      <div className="flex flex-col gap-3 xl:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} className="gap-3 py-4">
            <div className="flex items-start justify-between gap-3 px-4">
              <div className="flex min-w-0 flex-col gap-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="size-8 rounded-md" />
            </div>
            <div className="flex items-center justify-between px-4">
              <Skeleton className="h-5.5 w-16 rounded-lg" />
              <Skeleton className="h-4 w-20" />
            </div>
          </Card>
        ))}
      </div>

      <div className="hidden min-h-0 w-full flex-1 overflow-hidden rounded-[14px] border xl:block">
        <div className="bg-muted grid h-10 grid-cols-[14rem_8rem_9.5rem_9.5rem_11rem_auto] items-center gap-4 px-4">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-3 w-8" />
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="divide-border divide-y">
          {Array.from({ length: 6 }, (_, index) => (
            <TableRowSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
