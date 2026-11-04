import { Skeleton } from '@/components/ui/skeleton';

function MetricSkeleton() {
  return (
    <div className="border-border bg-card flex min-h-[156px] flex-col rounded-[14px] border px-6 py-6 sm:min-h-32 sm:px-5 sm:py-5">
      <Skeleton className="h-10 w-16" />
      <Skeleton className="mt-2 h-4 w-28" />
      <Skeleton className="mt-2 h-4 w-32" />
    </div>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <div aria-busy="true" className="bg-surface-page flex-1">
      <span className="sr-only">Cargando…</span>
      <div className="mx-auto flex w-full max-w-[1185px] flex-col gap-5 px-4 py-5 sm:gap-4 sm:py-6 lg:px-6">
        <section className="border-border pb-1 sm:border-b sm:pb-5">
          <Skeleton className="h-3 w-16 sm:hidden" />
          <div className="mt-0.5 flex items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center">
              <Skeleton className="h-8 w-64 max-w-full" />
              <div className="flex gap-2">
                <Skeleton className="h-5.5 w-16 rounded-lg" />
                <Skeleton className="h-5.5 w-32 rounded-lg" />
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="hidden h-9 w-36 rounded-md sm:block" />
            </div>
          </div>
          <Skeleton className="mt-3 h-4 w-full max-w-xl" />
          <div className="mt-3 flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:gap-x-4">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-4 w-40" />
            ))}
            <Skeleton className="h-4 w-56" />
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3 md:hidden">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-24 rounded-md" />
          </div>
        </section>

        <div className="grid min-w-0 gap-4 md:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <section key={index} className="border-border bg-card rounded-[14px] border p-4 sm:p-5">
              <Skeleton className="h-4 w-36" />
              <div className="mt-3 flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            </section>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => (
            <MetricSkeleton key={index} />
          ))}
        </div>

        <div className="grid items-stretch gap-4 lg:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-4">
            <section className="border-border bg-card rounded-[14px] border p-4 sm:p-5">
              <Skeleton className="h-4 w-52" />
              <Skeleton className="mt-4 h-3 w-36" />
              <div className="mt-4 flex flex-col gap-4">
                {Array.from({ length: 5 }, (_, index) => (
                  <div key={index} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                    <Skeleton className="hidden h-1.5 w-full rounded-full sm:block" />
                  </div>
                ))}
              </div>
            </section>
            <section className="border-border bg-card grid min-h-32 grid-cols-[7rem_minmax(0,1fr)] items-center gap-3 rounded-[14px] border p-4 sm:grid-cols-[10rem_minmax(0,1fr)] sm:gap-4 sm:p-5">
              <Skeleton className="aspect-video w-full rounded-lg" />
              <div className="flex flex-col gap-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-32" />
              </div>
            </section>
          </div>
          <section className="border-border bg-card h-full rounded-[14px] border p-4 sm:p-5">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="mt-4 h-3 w-64 max-w-full" />
            <div className="mt-3 flex flex-col gap-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div
                  key={index}
                  className="border-border flex flex-col gap-1 border-b py-4 last:border-b-0"
                >
                  <Skeleton className="h-8 w-20" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-48" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
