import { Skeleton } from '@/components/ui/skeleton';

const SKELETON_BUBBLES = 5;

export function DepartmentPresenceSkeleton() {
  return (
    <div className="grid w-full items-center gap-14 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-20">
      <div className="flex w-full flex-col gap-5 text-left">
        <div className="flex flex-col gap-1">
          <h2 className="text-foreground text-2xl leading-8 font-bold tracking-normal sm:text-3xl sm:leading-9">
            Presencia en el Uruguay
          </h2>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: SKELETON_BUBBLES }, (_, index) => (
            <Skeleton key={index} className="h-6.5 w-20 rounded-[14px]" />
          ))}
        </div>
        <Skeleton className="h-100 w-full rounded-xl" />
      </div>
      <div className="grid min-w-0 grid-cols-2 gap-4">
        <Skeleton className="h-80 w-full rounded-xl" />
        <Skeleton className="h-80 w-full rounded-xl" />
      </div>
    </div>
  );
}
