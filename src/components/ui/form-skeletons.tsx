import { cn } from 'cn';
import { Skeleton } from '@/components/ui/skeleton';

export function FieldSkeleton({
  className,
  labelClassName,
}: {
  className?: string;
  labelClassName?: string;
}) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <Skeleton className={cn('h-4 w-28', labelClassName)} />
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

export function InfoRows({ count, rowClassName }: { count: number; rowClassName?: string }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="flex items-center justify-between gap-4">
          <Skeleton className={cn('h-4 w-28', rowClassName)} />
          <Skeleton className={cn('h-4 w-24', rowClassName)} />
        </div>
      ))}
    </div>
  );
}
