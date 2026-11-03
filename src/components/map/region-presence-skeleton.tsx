import { Skeleton } from '@/components/ui/skeleton';
import { CarouselCardSkeleton } from '@/components/projects/topic-carousel-skeleton';

export function RegionPresenceSkeleton() {
  return (
    <div className="grid w-full items-start gap-14 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-28">
      <div className="flex flex-col gap-4">
        <Skeleton className="mb-2 h-10 w-full" />
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton
            key={index}
            className={`${index === 0 ? 'h-30' : 'h-16'} w-full rounded-[10px]`}
          />
        ))}
      </div>
      <div className="min-w-0">
        <CarouselCardSkeleton />
      </div>
    </div>
  );
}
