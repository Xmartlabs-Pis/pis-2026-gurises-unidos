import type { ReactNode } from 'react';
import { cn } from 'cn';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

export function FormSection({
  variant = 'default',
  title,
  description,
  className,
  contentClassName,
  descriptionClassName,
  descriptionSpacing = 'compact',
  separator = true,
  children,
}: {
  variant?: 'default' | 'detailed';
  title: string;
  description?: string;
  className?: string;
  contentClassName?: string;
  descriptionClassName?: string;
  descriptionSpacing?: 'compact' | 'relaxed';
  separator?: boolean;
  children: ReactNode;
}) {
  return (
    <Card
      className={cn(
        variant === 'detailed'
          ? 'bg-background gap-0 overflow-visible rounded-[14px] border py-0 shadow-none ring-0'
          : 'bg-background ring-border gap-0 overflow-visible rounded-2xl py-0 shadow-none ring-1',
        className
      )}
    >
      <div className="px-4 pt-5 sm:px-6">
        <h2 className="text-foreground text-base leading-6 font-semibold">{title}</h2>
        {description && (
          <p
            className={cn(
              'text-muted-foreground',
              descriptionSpacing === 'relaxed'
                ? 'mt-3.5 text-sm leading-5'
                : 'mt-0.5 text-xs leading-4',
              descriptionClassName
            )}
          >
            {description}
          </p>
        )}
      </div>
      {separator && (
        <div className="px-4 sm:px-6">
          <Separator className={variant === 'detailed' ? 'mt-3.5' : 'mt-4'} />
        </div>
      )}
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col gap-4 px-4 pb-5 sm:px-6',
          variant === 'detailed' ? 'pt-3.5' : 'pt-4',
          contentClassName
        )}
      >
        {children}
      </div>
    </Card>
  );
}
