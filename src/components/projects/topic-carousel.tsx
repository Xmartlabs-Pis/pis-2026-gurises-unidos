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
  type CarouselApi,
} from '@/components/ui/carousel';

const LOAD_MORE_THRESHOLD = 3;

type TopicCarouselProps = {
  year: number;
  topicId: number;
  topic: string;
  initialPage: PublicProjectsPage;
};

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
    <Carousel setApi={setApi} aria-label={topic} className="flex flex-col gap-4">
      <div className="flex flex-row justify-between">
        <div className="flex flex-row items-center gap-3">
          <p className="text-foreground text-xl leading-7 font-semibold">{topic}</p>
        </div>
        <div className="flex flex-row gap-2">
          <CarouselPrevious className="static hidden h-9 w-9 gap-2.5 rounded-lg border bg-white shadow-xs/10 md:flex" />
          <CarouselNext className="static hidden h-9 w-9 gap-2.5 rounded-lg border bg-white shadow-xs/10 md:flex" />
        </div>
      </div>
      <CarouselContent>
        {projects.map((project) => (
          <CarouselItem key={project.id} className="basis-75 lg:basis-100">
            <ProjectCard
              variant="public-dark"
              territory={project.territory}
              name={project.name}
              description={project.description}
              coverPhoto={project.coverPhoto}
              reach={project.reach}
            />
          </CarouselItem>
        ))}
        {hasMore && (
          <CarouselItem className="basis-75 lg:basis-100">
            {failed ? (
              <div className="bg-card flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border-2 px-6 text-center">
                <p role="alert" className="text-muted-foreground text-sm">
                  No se pudieron cargar más proyectos.
                </p>
                <Button
                  variant="outline"
                  className="h-9 border bg-white px-4 shadow-xs/10"
                  onClick={loadMore}
                >
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
