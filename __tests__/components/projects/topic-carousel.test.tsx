import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { useEffect, type ReactNode } from 'react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

type ScrollHandler = () => void;

const mocks = vi.hoisted(() => ({
  loadPublicProjectsPage: vi.fn(),
  slidesInView: vi.fn<() => number[]>(),
  slideNodes: vi.fn<() => unknown[]>(),
  scrollState: { canScrollPrev: false, canScrollNext: false },
  handlers: new Map<string, Set<() => void>>(),
}));

vi.mock('@/app/actions/public-projects', () => ({
  loadPublicProjectsPage: mocks.loadPublicProjectsPage,
}));

vi.mock('@/components/projects/project-card', () => ({
  ProjectCard: ({ name }: { name: string }) => <article>{name}</article>,
}));

vi.mock('@/components/projects/topic-carousel-skeleton', () => ({
  CarouselCardSkeleton: () => <div data-testid="carousel-skeleton" />,
}));

vi.mock('@/components/ui/carousel', () => {
  const api = {
    slidesInView: () => mocks.slidesInView(),
    slideNodes: () => mocks.slideNodes(),
    on(event: string, handler: ScrollHandler) {
      if (!mocks.handlers.has(event)) mocks.handlers.set(event, new Set());
      mocks.handlers.get(event)!.add(handler);
      return api;
    },
    off(event: string, handler: ScrollHandler) {
      mocks.handlers.get(event)?.delete(handler);
      return api;
    },
  };

  return {
    Carousel: ({ setApi, children }: { setApi: (value: unknown) => void; children: ReactNode }) => {
      useEffect(() => setApi(api), [setApi]);
      return <div>{children}</div>;
    },
    CarouselContent: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    CarouselItem: ({ children }: { children: ReactNode }) => <div>{children}</div>,
    CarouselPrevious: () => <button type="button">Anterior</button>,
    CarouselNext: () => <button type="button">Siguiente</button>,
    useCarousel: () => mocks.scrollState,
  };
});

import { TopicCarousel } from '@/components/projects/topic-carousel';

const FAR_FROM_THE_END = [0];
const NEAR_THE_END = [8];
const TEN_SLIDES = Array.from({ length: 10 });

function project(id: number) {
  return {
    id,
    name: `Proyecto ${id}`,
    territory: 'Montevideo',
    description: 'Descripción',
    coverPhoto: null,
    reach: 10,
  };
}

function renderCarousel({ hasMore = true, total = 12 } = {}) {
  return render(
    <TopicCarousel
      year={2026}
      topicId={4}
      topic="Educación"
      total={total}
      initialPage={{ items: [project(1)], page: 1, hasMore }}
    />
  );
}

async function scrollTo(visibleSlides: number[]) {
  mocks.slidesInView.mockReturnValue(visibleSlides);
  await act(async () => {
    mocks.handlers.get('select')?.forEach((handler) => handler());
  });
}

beforeEach(() => {
  mocks.loadPublicProjectsPage.mockReset();
  mocks.handlers.clear();
  mocks.slidesInView.mockReset().mockReturnValue(FAR_FROM_THE_END);
  mocks.slideNodes.mockReset().mockReturnValue(TEN_SLIDES);
  mocks.scrollState.canScrollPrev = false;
  mocks.scrollState.canScrollNext = false;
});

describe('TopicCarousel', () => {
  test('shows the topic with its project count', () => {
    renderCarousel();

    expect(screen.getByRole('heading', { name: 'Educación' })).toBeDefined();
    expect(screen.getByText('12 proyectos')).toBeDefined();
    expect(screen.getByText('Proyecto 1')).toBeDefined();
  });

  test('uses the singular for a single project', () => {
    renderCarousel({ hasMore: false, total: 1 });

    expect(screen.getByText('1 proyecto')).toBeDefined();
  });

  test('does not load more while the last visible slide is far from the end', async () => {
    renderCarousel();

    await scrollTo([6]);

    expect(mocks.loadPublicProjectsPage).not.toHaveBeenCalled();
    expect(screen.getByTestId('carousel-skeleton')).toBeDefined();
  });

  test('starts loading at the threshold of remaining slides', async () => {
    mocks.loadPublicProjectsPage.mockReturnValue(new Promise(() => {}));
    renderCarousel();

    await scrollTo([7]);

    expect(mocks.loadPublicProjectsPage).toHaveBeenCalledOnce();
  });

  test('loads on mount when the visible slides are already close to the end', async () => {
    mocks.loadPublicProjectsPage.mockResolvedValue({
      items: [project(2)],
      page: 2,
      hasMore: false,
    });
    mocks.slidesInView.mockReturnValue(NEAR_THE_END);

    renderCarousel();

    expect(await screen.findByText('Proyecto 2')).toBeDefined();
    expect(mocks.loadPublicProjectsPage).toHaveBeenCalledExactlyOnceWith(2026, 4, 2);
  });

  test('appends the next page when scrolling close to the end', async () => {
    mocks.loadPublicProjectsPage.mockResolvedValue({
      items: [project(2)],
      page: 2,
      hasMore: false,
    });
    renderCarousel();

    await scrollTo(NEAR_THE_END);

    expect(mocks.loadPublicProjectsPage).toHaveBeenCalledExactlyOnceWith(2026, 4, 2);
    expect(await screen.findByText('Proyecto 2')).toBeDefined();
    expect(screen.getByText('Proyecto 1')).toBeDefined();
    expect(screen.queryByTestId('carousel-skeleton')).toBeNull();
  });

  test('requests the following page number on each load', async () => {
    mocks.loadPublicProjectsPage
      .mockResolvedValueOnce({ items: [project(2)], page: 2, hasMore: true })
      .mockResolvedValueOnce({ items: [project(3)], page: 3, hasMore: false });
    renderCarousel();

    await scrollTo(NEAR_THE_END);
    await scrollTo(NEAR_THE_END);

    expect(mocks.loadPublicProjectsPage).toHaveBeenLastCalledWith(2026, 4, 3);
    expect(await screen.findByText('Proyecto 3')).toBeDefined();
  });

  test('does not start a second load while one is in flight', async () => {
    mocks.loadPublicProjectsPage.mockReturnValue(new Promise(() => {}));
    renderCarousel();

    await scrollTo(NEAR_THE_END);
    await scrollTo(NEAR_THE_END);

    expect(mocks.loadPublicProjectsPage).toHaveBeenCalledOnce();
  });

  test('does not load when there are no more projects', async () => {
    renderCarousel({ hasMore: false });

    await scrollTo(NEAR_THE_END);

    expect(mocks.loadPublicProjectsPage).not.toHaveBeenCalled();
    expect(screen.queryByTestId('carousel-skeleton')).toBeNull();
  });

  test('shows the failed state and stops loading on scroll', async () => {
    mocks.loadPublicProjectsPage.mockRejectedValue(new Error('network'));
    renderCarousel();

    await scrollTo(NEAR_THE_END);

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No se pudieron cargar más proyectos.'
    );

    await scrollTo(NEAR_THE_END);

    expect(mocks.loadPublicProjectsPage).toHaveBeenCalledOnce();
  });

  test('retries a failed load', async () => {
    mocks.loadPublicProjectsPage
      .mockRejectedValueOnce(new Error('network'))
      .mockResolvedValueOnce({ items: [project(2)], page: 2, hasMore: false });
    renderCarousel();

    await scrollTo(NEAR_THE_END);
    fireEvent.click(await screen.findByRole('button', { name: 'Reintentar' }));

    expect(await screen.findByText('Proyecto 2')).toBeDefined();
    expect(mocks.loadPublicProjectsPage).toHaveBeenCalledTimes(2);
    expect(mocks.loadPublicProjectsPage).toHaveBeenLastCalledWith(2026, 4, 2);
    await waitFor(() => expect(screen.queryByRole('alert')).toBeNull());
  });

  test('removes its scroll listeners on unmount', () => {
    const { unmount } = renderCarousel();
    expect(mocks.handlers.get('select')?.size).toBe(1);

    unmount();

    expect(mocks.handlers.get('select')?.size).toBe(0);
    expect(mocks.handlers.get('slidesInView')?.size).toBe(0);
  });

  test('hides the controls when the carousel cannot scroll', () => {
    renderCarousel();

    expect(screen.queryByRole('button', { name: 'Anterior' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Siguiente' })).toBeNull();
  });

  test.each([
    ['forward', { canScrollPrev: false, canScrollNext: true }],
    ['back', { canScrollPrev: true, canScrollNext: false }],
  ])('shows the controls when the carousel can only scroll %s', (_direction, scrollState) => {
    Object.assign(mocks.scrollState, scrollState);
    renderCarousel();

    expect(screen.getByRole('button', { name: 'Anterior' })).toBeDefined();
    expect(screen.getByRole('button', { name: 'Siguiente' })).toBeDefined();
  });
});
