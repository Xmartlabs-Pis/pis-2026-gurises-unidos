'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { loadPublicProjectsPage } from '@/app/actions/public-projects';
import type { PublicProjectsPage } from '@/lib/projects/public-projects';
import { ProjectCard } from '@/components/projects/project-card';
import { CarouselCardSkeleton } from '@/components/projects/topic-carousel-skeleton';
import { Button } from '@/components/ui/button';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  useCarousel,
  type CarouselApi,
} from '@/components/ui/carousel';

const LOAD_MORE_THRESHOLD = 3;

type TopicCarouselProps = {
  year: number;
  topicId: number;
  topic: string;
  initialPage: PublicProjectsPage;
};

function TopicCarouselControls() {
  const { canScrollPrev, canScrollNext } = useCarousel();

  if (!canScrollPrev && !canScrollNext) return null;

  return (
    <div className="flex shrink-0 gap-2">
      <CarouselPrevious className="static size-9 rounded-lg bg-white" />
      <CarouselNext className="static size-9 rounded-lg bg-white" />
    </div>
  );
}

export function TopicCarousel({ year, topicId, topic, initialPage }: TopicCarouselProps) {
  const [projects, setProjects] = useState(initialPage.items);
  const [hasMore, setHasMore] = useState(initialPage.hasMore);
  const [failed, setFailed] = useState(false);
  const [api, setApi] = useState<CarouselApi>();
  const pageRef = useRef(initialPage.page);
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !hasMore) return;
    loadingRef.current = true;
    setFailed(false);
    try {
      const next = await loadPublicProjectsPage(year, topicId, pageRef.current + 1);
      pageRef.current = next.page;
      setProjects((current) => [...current, ...next.items]);
      setHasMore(next.hasMore);
    } catch {
      setFailed(true);
    } finally {
      loadingRef.current = false;
    }
  }, [year, topicId, hasMore]);

  useEffect(() => {
    if (!api || failed) return;
    const onScroll = () => {
      const lastVisible = Math.max(...api.slidesInView());
      if (lastVisible >= api.slideNodes().length - LOAD_MORE_THRESHOLD) loadMore();
    };
    onScroll();
    api.on('select', onScroll).on('slidesInView', onScroll);
    return () => {
      api.off('select', onScroll).off('slidesInView', onScroll);
    };
  }, [api, failed, loadMore]);

  return (
    <Carousel setApi={setApi} aria-label={topic} className="flex flex-col gap-5">
      <div className="flex min-h-9 items-center justify-between gap-4">
        <div className="flex flex-row items-center gap-3">
          <p className="text-foreground text-xl leading-7 font-semibold">{topic}</p>
        </div>
        <TopicCarouselControls />
      </div>
      <CarouselContent>
        {projects.map((project) => (
          <CarouselItem key={project.id} className="basis-72 sm:basis-76">
            <ProjectCard
              variant="public-light"
              territory={project.territory}
              name={project.name}
              description={project.description}
              coverPhoto={project.coverPhoto}
              reach={project.reach}
            />
          </CarouselItem>
        ))}
        {hasMore && (
          <CarouselItem className="basis-72 sm:basis-76">
            {failed ? (
              <div className="border-border flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border bg-white px-6 text-center">
                <p role="alert" className="text-muted-foreground text-sm">
                  No se pudieron cargar más proyectos.
                </p>
                <Button variant="outline" className="h-9 border bg-white px-4" onClick={loadMore}>
                  Reintentar
                </Button>
              </div>
            ) : (
              <CarouselCardSkeleton />
            )}
          </CarouselItem>
        )}
      </CarouselContent>
    </Carousel>
  );
}
