import { Skeleton } from '@/components/ui/skeleton';

function MetricCardSkeleton() {
  return (
    <article className="bg-card border-border-default flex min-w-0 flex-col gap-3 rounded-[14px] border p-5">
      <Skeleton className="h-6 w-36" />
      <Skeleton className="h-10 w-full rounded-md" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-4/5" />
      <div className="flex items-center gap-3 border-t pt-4">
        <Skeleton className="h-5 w-9 rounded-full" />
        <Skeleton className="h-4 w-40" />
      </div>
    </article>
  );
}

export function MetricsFormSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-1 flex-col">
      <span className="sr-only">Cargando…</span>
      <div className="mx-auto grid w-full max-w-[1185px] items-start gap-y-6 xl:grid-cols-[minmax(0,760fr)_minmax(0,425fr)]">
        <section className="bg-surface-page flex min-w-0 flex-col gap-5 px-6 pt-6 pb-8">
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-9 w-full rounded-md" />
            <Skeleton className="h-9 w-56 rounded-md" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 7 }, (_, index) => (
              <MetricCardSkeleton key={index} />
            ))}
          </div>
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Skeleton className="h-6 w-52" />
              <div className="flex items-center gap-3">
                <Skeleton className="h-5 w-9 rounded-full" />
                <Skeleton className="h-4 w-44" />
              </div>
            </div>
            <Skeleton className="h-4 w-full max-w-xl" />
            <div className="grid gap-3 md:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <div
                  key={index}
                  className="bg-card border-border-default flex items-center justify-between gap-4 rounded-xl border p-4"
                >
                  <div className="flex flex-col gap-1.5">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                  <Skeleton className="h-5 w-9 rounded-full" />
                </div>
              ))}
            </div>
          </div>
          <div className="bg-card border-border-default flex flex-col gap-4 rounded-[14px] border p-5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-9 min-w-0 flex-1 rounded-md" />
              <Skeleton className="size-9 rounded-md" />
            </div>
            {Array.from({ length: 3 }, (_, index) => (
              <Skeleton key={index} className="h-9 w-full rounded-md" />
            ))}
          </div>
        </section>

        <aside className="bg-card border-border-default flex w-full flex-col overflow-hidden border xl:sticky xl:top-6 xl:mt-6">
          <div className="bg-surface-page border-border-default flex h-12 items-center justify-between gap-2 border-b px-5 py-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="bg-surface-subtle flex w-full flex-col gap-3 px-6 py-8">
            <div className="bg-surface-brand-deep flex w-full flex-col gap-3.5 rounded-[14px] p-5">
              <Skeleton className="h-3 w-24 bg-white/20" />
              {Array.from({ length: 4 }, (_, index) => (
                <div key={index} className="flex items-center gap-2.5">
                  <Skeleton className="h-10 w-16 bg-white/20" />
                  <Skeleton className="h-4 w-32 bg-white/20" />
                </div>
              ))}
            </div>
            <Skeleton className="mx-auto h-3 w-64 max-w-full" />
            <Skeleton className="mx-auto h-5 w-36" />
          </div>
        </aside>
      </div>

      <footer className="bg-background sticky bottom-0 z-20 mt-auto flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 sm:px-6">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-9 w-36 rounded-lg" />
      </footer>
    </div>
  );
}
