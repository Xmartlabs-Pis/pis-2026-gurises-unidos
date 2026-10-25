'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { cn } from 'cn';
import { Button } from '@/components/ui/button';
import { ProjectCard } from '@/components/projects/project-card';
import { ProjectCardSkeleton } from '@/components/projects/projects-card-listing-skeleton';
import { loadProjectsPage } from '@/app/actions/projects';
import type { ProjectListItem } from '@/lib/projects/list';
import { getTerritoryLabel } from '@/lib/projects/location';

const LOAD_MORE_MARGIN = '400px';
const LOADING_SKELETONS = 3;

export type ProjectListQuery = {
  status: string;
  beneficiaryYear: string;
  search?: string;
  departmentId?: string;
  topicId?: string;
  strategicLineId?: string;
};

type ProjectCardsGridProps = {
  projects: ProjectListItem[];
  page: number;
  totalPages: number;
  query: ProjectListQuery;
  isPending: boolean;
};

export function ProjectCardsGrid({
  projects,
  page,
  totalPages,
  query,
  isPending,
}: ProjectCardsGridProps) {
  const [items, setItems] = useState(projects);
  const [pagination, setPagination] = useState({ page, totalPages });
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const hasMore = pagination.page < pagination.totalPages;

  const loadMore = useCallback(async () => {
    setIsLoadingMore(true);
    setLoadFailed(false);
    try {
      const next = await loadProjectsPage(query, pagination.page + 1);
      setItems((loaded) => {
        const loadedIds = new Set(loaded.map((p) => p.id));
        return [...loaded, ...next.items.filter((p) => !loadedIds.has(p.id))];
      });
      setPagination({ page: next.page, totalPages: next.totalPages });
    } catch {
      setLoadFailed(true);
    } finally {
      setIsLoadingMore(false);
    }
  }, [query, pagination.page]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel || !hasMore || isLoadingMore || loadFailed) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) void loadMore();
      },
      { rootMargin: LOAD_MORE_MARGIN }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, loadFailed, loadMore]);

  if (items.length === 0) {
    return (
      <p className="text-muted-foreground py-10 text-center text-sm">
        No hay proyectos con estas características.
      </p>
    );
  }

  return (
    <>
      <div
        aria-busy={isPending || isLoadingMore}
        className={cn(
          'grid grid-cols-[repeat(auto-fill,minmax(358px,1fr))] gap-4 transition-opacity',
          isPending && 'opacity-60'
        )}
      >
        {items.map((p) => {
          const latestBeneficiaries = p.beneficiaries.at(0);
          return (
            <ProjectCard
              key={p.id}
              id={p.id}
              name={p.name}
              status={p.status}
              territory={getTerritoryLabel(p)}
              coordinator={`${p.leadCoordinator.firstName} ${p.leadCoordinator.lastName}`}
              intensity={p.intensity}
              year={latestBeneficiaries?.year ?? p.startYear}
              totalReach={latestBeneficiaries?.total ?? null}
            />
          );
        })}
        {isLoadingMore &&
          Array.from({ length: LOADING_SKELETONS }).map((_, index) => (
            <ProjectCardSkeleton key={index} />
          ))}
      </div>

      {loadFailed && (
        <div className="flex flex-col items-center gap-2 py-4">
          <p className="text-muted-foreground text-sm">No se pudieron cargar más proyectos.</p>
          <Button variant="outline" onClick={() => void loadMore()}>
            Reintentar
          </Button>
        </div>
      )}
      {hasMore && <div ref={sentinelRef} aria-hidden="true" />}
    </>
  );
}
