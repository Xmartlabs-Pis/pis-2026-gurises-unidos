import { Skeleton } from '@/components/ui/skeleton';

export function AuditLogSkeleton() {
  return (
    <div className="flex w-full flex-1 flex-col gap-5 px-4 pt-6 pb-8 sm:px-6">
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="h-9 w-full max-w-md rounded-lg" />
          <Skeleton className="hidden h-4 w-24 md:block" />
        </div>
        <Skeleton className="h-9 w-24 rounded-md" />
      </div>

      <div className="flex flex-col gap-3 xl:hidden">
        {Array.from({ length: 4 }, (_, index) => (
          <div
            key={index}
            className="bg-card ring-foreground/10 flex flex-col gap-3 rounded-xl px-4 py-4 ring-1"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-5.5 w-20 rounded-lg" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-52" />
          </div>
        ))}
      </div>

      <div className="hidden overflow-hidden rounded-[14px] border xl:block">
        <div className="bg-muted grid h-10 grid-cols-4 items-center gap-4 px-4">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-14" />
          <Skeleton className="h-3 w-32" />
        </div>
        <div className="divide-border divide-y">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="grid h-15 grid-cols-4 items-center gap-4 px-4">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-5.5 w-20 rounded-lg" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <Skeleton className="h-4 w-36" />
        <div className="flex items-center gap-1">
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
          <Skeleton className="size-8 rounded-md" />
        </div>
        <Skeleton className="h-9 w-32 rounded-md" />
      </div>
    </div>
  );
}
