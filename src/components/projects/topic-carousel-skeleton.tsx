import { Skeleton } from '@/components/ui/skeleton';

const SKELETON_CARDS = 5;

export function CarouselCardSkeleton() {
  return (
    <div className="border-border h-full w-full overflow-hidden rounded-xl border bg-white">
      <Skeleton className="h-48 w-full rounded-none" />
      <div className="flex flex-col gap-3 px-5 py-4">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-7 w-1/2" />
      </div>
    </div>
  );
}

export function TopicCarouselSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-row items-center gap-3">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="flex flex-row gap-4 overflow-hidden">
        {Array.from({ length: SKELETON_CARDS }, (_, index) => (
          <div key={index} className="h-100 w-72 shrink-0 sm:w-76">
            <CarouselCardSkeleton />
          </div>
        ))}
      </div>
    </div>
  );
}
