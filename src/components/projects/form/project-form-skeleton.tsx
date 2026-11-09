import type { ReactNode } from 'react';
import { cn } from 'cn';
import { FieldSkeleton } from '@/components/ui/form-skeletons';
import { Skeleton } from '@/components/ui/skeleton';

function FormSectionSkeleton({
  description = false,
  children,
  variant = 'default',
}: {
  description?: boolean;
  children: ReactNode;
  variant?: 'default' | 'detailed';
}) {
  return (
    <div
      className={
        variant === 'detailed'
          ? 'bg-background flex flex-col overflow-visible rounded-[14px] border'
          : 'bg-background ring-border flex flex-col overflow-visible rounded-2xl ring-1'
      }
    >
      <div className="px-4 pt-5 sm:px-6">
        <Skeleton className="h-6 w-44" />
        {description && <Skeleton className="mt-1.5 h-4 w-72 max-w-full" />}
      </div>
      <div className="px-4 sm:px-6">
        <div className="bg-border mt-4 h-px" />
      </div>
      <div className="flex flex-col gap-4 px-4 pt-4 pb-5 sm:px-6">{children}</div>
    </div>
  );
}

export function ProjectFormSkeleton({ mode = 'create' }: { mode?: 'create' | 'edit' }) {
  const isEditing = mode === 'edit';

  const form = (
    <div
      aria-busy={isEditing ? undefined : true}
      className={cn(
        'flex min-h-0 w-full min-w-0 flex-1 flex-col',
        isEditing ? 'bg-surface-page' : 'bg-muted/30'
      )}
    >
      {!isEditing && <span className="sr-only">Cargando…</span>}
      <div
        className={cn(
          'mx-auto grid w-full max-w-[1185px] flex-1 content-start items-start',
          isEditing
            ? 'lg:grid-cols-[minmax(0,152fr)_minmax(0,85fr)]'
            : 'lg:grid-cols-[minmax(0,16fr)_minmax(0,9fr)]'
        )}
      >
        <div
          className={cn(
            'flex min-w-0 flex-col gap-5 px-4 pt-6 pb-8 sm:px-6',
            !isEditing && 'lg:pb-20'
          )}
        >
          <FormSectionSkeleton>
            <FieldSkeleton />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton />
          </FormSectionSkeleton>

          <FormSectionSkeleton description>
            <FieldSkeleton />
            <FieldSkeleton />
          </FormSectionSkeleton>

          <FormSectionSkeleton description>
            <FieldSkeleton />
            <FieldSkeleton />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, index) => (
                <FieldSkeleton key={index} />
              ))}
            </div>
          </FormSectionSkeleton>

          <FormSectionSkeleton description>
            <FieldSkeleton />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
            <Skeleton className="h-36 w-full rounded-lg" />
          </FormSectionSkeleton>

          <FormSectionSkeleton description>
            <div className="flex items-center gap-3">
              <Skeleton className="h-5 w-9 rounded-full" />
              <Skeleton className="h-4 w-44" />
            </div>
          </FormSectionSkeleton>

          <FormSectionSkeleton description>
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-24 w-full rounded-lg" />
            </div>
          </FormSectionSkeleton>

          {isEditing && (
            <>
              <FormSectionSkeleton>
                <div className="flex flex-col gap-4">
                  {Array.from({ length: 3 }, (_, index) => (
                    <div key={index} className="flex flex-col gap-1.5">
                      <Skeleton className="h-4 w-64 max-w-full" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  ))}
                </div>
              </FormSectionSkeleton>
              <FormSectionSkeleton description variant="detailed">
                <Skeleton className="h-9 w-40 rounded-md" />
              </FormSectionSkeleton>
            </>
          )}
        </div>

        <aside className="bg-muted/30 min-w-0 lg:sticky lg:top-2">
          <div className="bg-surface-page flex min-h-12 items-center justify-between gap-2 border-b px-5 py-3">
            <Skeleton className="h-3 w-44" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="bg-muted flex flex-col items-center gap-3 px-6 py-8">
            <div className="bg-card w-full max-w-[377px] overflow-hidden rounded-xl">
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="flex flex-col gap-2 p-4">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
        </aside>
      </div>

      <footer className="bg-background sticky bottom-0 z-20 flex flex-wrap items-center justify-between gap-3 border-t px-4 py-4 sm:px-6">
        <Skeleton className="h-9 w-24 rounded-md" />
        <Skeleton className="h-9 w-36 rounded-md" />
      </footer>
    </div>
  );

  if (!isEditing) return form;

  return (
    <div aria-busy="true" className="bg-surface-page flex min-h-0 w-full flex-1 flex-col">
      <span className="sr-only">Cargando…</span>
      <div className="mx-auto flex w-full max-w-[1185px] min-w-0 flex-col items-start gap-1.5 px-4 pt-6 pb-2.5 sm:px-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-9 w-72 max-w-full" />
        <Skeleton className="h-5 w-44" />
      </div>
      {form}
    </div>
  );
}
