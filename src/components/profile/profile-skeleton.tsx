import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FieldSkeleton, InfoRows } from '@/components/ui/form-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export function ProfileSkeleton() {
  return (
    <div
      aria-busy="true"
      className="bg-primary-foreground flex min-h-0 w-full min-w-0 flex-1 flex-col pt-6"
    >
      <span className="sr-only">Cargando…</span>
      <div className="mx-auto w-full max-w-[1185px] flex-1 px-6 pb-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_425px]">
          <div className="flex min-w-0 flex-col gap-5">
            <Card className="gap-4 pt-5 pb-5">
              <CardHeader className="px-6">
                <Skeleton className="h-6 w-36" />
                <Skeleton className="h-4 w-80 max-w-full" />
              </CardHeader>
              <CardContent className="px-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FieldSkeleton />
                  <FieldSkeleton />
                  <FieldSkeleton />
                  <FieldSkeleton />
                </div>
              </CardContent>
            </Card>

            <Card className="gap-4 pt-5 pb-5">
              <CardHeader className="px-6">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-4 w-full max-w-lg" />
              </CardHeader>
              <CardContent className="px-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <FieldSkeleton className="md:col-span-2" />
                  <FieldSkeleton />
                  <FieldSkeleton />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <Card className="gap-4 pt-5 pb-5">
              <CardHeader className="px-6">
                <Skeleton className="h-6 w-20" />
                <Skeleton className="h-4 w-full max-w-sm" />
              </CardHeader>
              <CardContent className="px-6">
                <InfoRows count={2} />
              </CardContent>
            </Card>

            <Card className="gap-4 pt-5 pb-5">
              <CardHeader className="px-6">
                <Skeleton className="h-6 w-28" />
              </CardHeader>
              <CardContent className="px-6">
                <InfoRows count={3} />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <footer className="bg-background sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 sm:px-6">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </footer>
    </div>
  );
}
