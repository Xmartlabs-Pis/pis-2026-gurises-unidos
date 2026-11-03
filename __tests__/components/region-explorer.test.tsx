import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { RegionExplorer } from '@/components/map/region-explorer';
import { GEOGRAPHIC_REGIONS } from '@/lib/projects/geographic-regions';
import type { PublicProject } from '@/lib/projects/public-projects';

vi.mock('@/components/map/geography-project-carousel', () => ({
  GeographyProjectCarousel: ({ projects }: { projects: PublicProject[] }) => (
    <div>
      {projects.map((project) => (
        <p key={project.id}>{project.name}</p>
      ))}
    </div>
  ),
}));

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(private callback: IntersectionObserverCallback) {}
      observe() {
        this.callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver
        );
      }
      disconnect() {}
    }
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const REGIONS = GEOGRAPHIC_REGIONS.map((region, index) => ({
  ...region,
  projects: [
    {
      id: index,
      name: `Regional project ${index}`,
      territory: region.name,
      description: '',
      coverPhoto: null,
      reach: 10,
    },
  ],
}));

test('cycles through all four regional carousels and returns to the first', () => {
  render(<RegionExplorer regions={REGIONS} year={2026} />);
  for (const index of [1, 2, 3, 0]) {
    act(() => vi.advanceTimersByTime(9100));
    expect(
      screen.getByRole('tab', { name: REGIONS[index].name }).getAttribute('aria-selected')
    ).toBe('true');
    expect(
      within(screen.getByRole('tabpanel')).getByText(`Regional project ${index}`)
    ).toBeDefined();
  }
});

test('clicking a region immediately filters its carousel and restarts the countdown', () => {
  render(<RegionExplorer regions={REGIONS} year={2026} />);
  act(() => vi.advanceTimersByTime(5000));
  fireEvent.click(screen.getByRole('tab', { name: 'Otras geografías' }));
  const panel = within(screen.getByRole('tabpanel'));
  expect(panel.getByText('Regional project 3')).toBeDefined();
  expect(panel.queryByText('Regional project 0')).toBeNull();
  act(() => vi.advanceTimersByTime(6000));
  expect(screen.getByRole('tab', { name: 'Otras geografías' }).getAttribute('aria-selected')).toBe(
    'true'
  );
  act(() => vi.advanceTimersByTime(3200));
  expect(screen.getByRole('tab', { name: 'América del Sur' }).getAttribute('aria-selected')).toBe(
    'true'
  );
});
