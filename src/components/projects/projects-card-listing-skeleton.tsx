import { Skeleton } from '@/components/ui/skeleton';

export function ProjectCardSkeleton() {
  return (
    <div className="bg-card flex flex-col gap-3.5 rounded-lg px-5 py-4.5">
      <div className="flex flex-row items-center justify-between">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-5.5 w-16 rounded-lg" />
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-row justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="flex flex-row justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-28" />
        </div>
        <div className="flex flex-row justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
      <div className="bg-border h-px w-full" />
      <div className="flex flex-row items-center justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-7 w-16" />
      </div>
    </div>
  );
}

export function ProjectsCardListSkeleton() {
  return (
    <div className="bg-primary-foreground flex h-full w-auto flex-col gap-5 pt-5 pr-4 pb-4 pl-4 lg:px-8 lg:py-7">
      <div className="flex flex-row items-start justify-between gap-3 lg:items-center">
        <div className="flex flex-col justify-center gap-0.5">
          <Skeleton className="h-4 w-16 lg:hidden" />
          <Skeleton className="h-8 w-48" />
        </div>
        <div className="flex flex-col items-end gap-3">
          <Skeleton className="h-9 w-22.5 rounded-md lg:hidden" />
          <Skeleton className="h-8 w-32 rounded-md" />
        </div>
      </div>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-row items-center gap-3">
          <Skeleton className="h-9 w-72 rounded-lg" />
          <Skeleton className="hidden h-5 w-20 lg:block" />
        </div>
        <Skeleton className="h-9 w-full rounded-md lg:ml-auto lg:w-80" />
        <Skeleton className="hidden h-9 w-22.5 rounded-md lg:block" />
      </div>
      <Skeleton className="h-7 w-24 lg:hidden" />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(358px,1fr))] gap-4">
        {Array.from({ length: 6 }).map((_, index) => (
          <ProjectCardSkeleton key={index} />
        ))}
      </div>
    </div>
  );
}
