import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { FieldSkeleton, InfoRows } from '@/components/ui/form-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

export function UserFormSkeleton() {
  return (
    <div
      aria-busy="true"
      className="bg-primary-foreground flex w-full min-w-0 flex-1 flex-col pt-6"
    >
      <span className="sr-only">Cargando…</span>
      <div className="mx-auto w-full max-w-[1185px] flex-1 px-6 pb-6">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_425px]">
          <div className="flex min-w-0 flex-col gap-5">
            <Card className="gap-4 pt-5 pb-5">
              <CardHeader className="px-6">
                <Skeleton className="h-6 w-36" />
              </CardHeader>
              <CardContent className="px-6">
                <div className="flex flex-col gap-4">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FieldSkeleton labelClassName="w-24" />
                    <FieldSkeleton labelClassName="w-24" />
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <FieldSkeleton labelClassName="w-24" />
                    <FieldSkeleton labelClassName="w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="gap-4 pt-5 pb-5">
              <CardHeader className="px-6">
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent className="px-6">
                <FieldSkeleton labelClassName="w-24" />
              </CardContent>
            </Card>

            <Card className="gap-4 pt-5 pb-5">
              <CardHeader className="px-6">
                <Skeleton className="h-6 w-16" />
              </CardHeader>
              <CardContent className="flex flex-col gap-4 px-6">
                <Skeleton className="h-9 w-40 rounded-md" />
                <Skeleton className="h-4 w-full max-w-md" />
              </CardContent>
            </Card>

            <Card className="gap-4 pt-5 pb-5">
              <CardHeader className="px-6">
                <Skeleton className="h-6 w-24" />
              </CardHeader>
              <CardContent className="flex flex-col gap-4 px-6">
                <Skeleton className="h-9 w-44 rounded-md" />
                <Skeleton className="h-4 w-full max-w-sm" />
              </CardContent>
            </Card>
          </div>

          <Card className="h-fit gap-4 pt-5 pb-5">
            <CardHeader className="px-6">
              <Skeleton className="h-6 w-28" />
            </CardHeader>
            <CardContent className="px-6">
              <InfoRows count={4} rowClassName="h-3" />
            </CardContent>
          </Card>
        </div>
      </div>

      <footer className="bg-background sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 sm:px-6">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </footer>
    </div>
  );
}
