import { Skeleton } from '@/components/ui/skeleton';

const SKELETON_BUBBLES = 5;

export function DepartmentPresenceSkeleton() {
  return (
    <div className="flex w-full flex-col items-center gap-8 lg:flex-row lg:gap-16">
      <div className="flex w-full max-w-105 flex-col gap-4 text-left">
        <div className="flex flex-col gap-1">
          <h2 className="text-foreground text-2xl leading-8 font-bold tracking-normal sm:text-3xl sm:leading-9">
            Presencia en todo Uruguay
          </h2>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: SKELETON_BUBBLES }, (_, index) => (
            <Skeleton key={index} className="h-6.5 w-20 rounded-[14px]" />
          ))}
        </div>
      </div>
      <div className="h-80 w-full min-w-0 lg:h-107 lg:max-w-138 lg:flex-1">
        <Skeleton className="h-full w-full rounded-xl" />
      </div>
    </div>
  );
}
