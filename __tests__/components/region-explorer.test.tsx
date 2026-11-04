import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { RegionExplorer } from '@/components/map/region-explorer';
import { GEOGRAPHIC_REGIONS } from '@/lib/projects/geographic-regions';
import type { PublicProject } from '@/lib/projects/public-projects';
import { PublicGeographyProvider, usePublicGeography } from '@/components/public-geography';

let motionPreference: MediaQueryList;

vi.mock('@/components/map/geography-project-carousel', () => ({
  GeographyProjectCarousel: ({ projects }: { projects: PublicProject[] }) => (
    <div>
      <button type="button">Next project</button>
      {projects.map((project) => (
        <p key={project.id}>{project.name}</p>
      ))}
    </div>
  ),
}));

beforeEach(() => {
  vi.useFakeTimers();
  motionPreference = new EventTarget() as MediaQueryList;
  Object.defineProperty(motionPreference, 'matches', { value: false, configurable: true });
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => motionPreference)
  );
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
    const previousRegion = screen
      .getAllByRole('tab')
      .find((tab) => tab.getAttribute('aria-selected') === 'true');
    act(() => vi.advanceTimersByTime(11900));
    expect(previousRegion?.getAttribute('aria-selected')).toBe('true');
    act(() => vi.advanceTimersByTime(200));
    expect(
      screen.getByRole('tab', { name: REGIONS[index].name }).getAttribute('aria-selected')
    ).toBe('true');
    expect(
      within(screen.getByRole('tabpanel')).getByText(`Regional project ${index}`)
    ).toBeDefined();
  }
});

test('clicking a region immediately filters its carousel without changing the pause button', () => {
  render(<RegionExplorer regions={REGIONS} year={2026} />);
  act(() => vi.advanceTimersByTime(5000));
  fireEvent.click(screen.getByRole('tab', { name: 'Otras geografías' }));
  const panel = within(screen.getByRole('tabpanel'));
  expect(panel.getByText('Regional project 3')).toBeDefined();
  expect(panel.queryByText('Regional project 0')).toBeNull();
  expect(
    screen.getByRole('button', { name: 'Pausar rotación de regiones' }).getAttribute('aria-pressed')
  ).toBe('false');
  act(() => vi.advanceTimersByTime(11900));
  expect(screen.getByRole('tab', { name: 'Otras geografías' }).getAttribute('aria-selected')).toBe(
    'true'
  );
  act(() => vi.advanceTimersByTime(200));
  expect(screen.getByRole('tab', { name: 'América del Sur' }).getAttribute('aria-selected')).toBe(
    'true'
  );
});

test.each(['mouse', 'touch'])(
  '%s interaction pauses progress and resumes from the same point after leaving',
  (pointerType) => {
    render(<RegionExplorer regions={REGIONS} year={2026} />);
    act(() => vi.advanceTimersByTime(5000));
    const section = screen.getByRole('tabpanel').parentElement!;
    const progress = section.querySelector<HTMLSpanElement>('span[style]')!;
    const before = progress.style.transform;
    fireEvent.pointerEnter(screen.getByRole('tabpanel'), { pointerType });
    act(() => vi.advanceTimersByTime(30000));
    expect(screen.getByText('Regional project 0')).toBeDefined();
    expect(progress.style.transform).toBe(before);
    fireEvent.pointerLeave(screen.getByRole('tabpanel'), { pointerType });
    act(() => vi.advanceTimersByTime(6000));
    expect(screen.getByText('Regional project 0')).toBeDefined();
    act(() => vi.advanceTimersByTime(1200));
    expect(screen.getByText('Regional project 1')).toBeDefined();
  }
);

test('hovering over the section background does not pause automatic changes', () => {
  render(<RegionExplorer regions={REGIONS} year={2026} />);
  const section = screen.getByRole('tabpanel').parentElement!;
  fireEvent.pointerEnter(section, { pointerType: 'mouse' });
  act(() => vi.advanceTimersByTime(12100));
  expect(screen.getByText('Regional project 1')).toBeDefined();
});

test('hovering over a specific region card pauses only until the pointer leaves it', () => {
  render(<RegionExplorer regions={REGIONS} year={2026} />);
  const card = screen.getByRole('tab', { name: REGIONS[0].name });
  fireEvent.pointerEnter(card, { pointerType: 'mouse' });
  act(() => vi.advanceTimersByTime(30000));
  expect(screen.getByText('Regional project 0')).toBeDefined();
  fireEvent.pointerLeave(card, { pointerType: 'mouse' });
  act(() => vi.advanceTimersByTime(12100));
  expect(screen.getByText('Regional project 1')).toBeDefined();
});

test('collapsed region cards do not pause until they become the active card', () => {
  render(<RegionExplorer regions={REGIONS} year={2026} />);
  const card = screen.getByRole('tab', { name: REGIONS[2].name });
  fireEvent.pointerEnter(card, { pointerType: 'mouse' });
  act(() => vi.advanceTimersByTime(12100));
  expect(screen.getByText('Regional project 1')).toBeDefined();
  act(() => vi.advanceTimersByTime(12100));
  expect(screen.getByText('Regional project 2')).toBeDefined();
  act(() => vi.advanceTimersByTime(32));
  act(() => vi.advanceTimersByTime(30000));
  expect(screen.getByText('Regional project 2')).toBeDefined();
  fireEvent.pointerLeave(card, { pointerType: 'mouse' });
  act(() => vi.advanceTimersByTime(12100));
  expect(screen.getByText('Regional project 3')).toBeDefined();
});

test('manual pause persists until play is pressed and the playback button does not pause through focus', () => {
  render(<RegionExplorer regions={REGIONS} year={2026} />);
  act(() => vi.advanceTimersByTime(5000));
  fireEvent.click(screen.getByRole('button', { name: 'Pausar rotación de regiones' }));
  act(() => vi.advanceTimersByTime(30000));
  expect(screen.getByText('Regional project 0')).toBeDefined();
  const resume = screen.getByRole('button', { name: 'Reanudar rotación de regiones' });
  expect(resume.getAttribute('aria-pressed')).toBe('true');
  act(() => resume.focus());
  fireEvent.click(resume);
  act(() => vi.advanceTimersByTime(7200));
  expect(screen.getByText('Regional project 1')).toBeDefined();
});

test('choosing a different region preserves a manual pause until play is pressed', () => {
  render(<RegionExplorer regions={REGIONS} year={2026} />);
  fireEvent.click(screen.getByRole('button', { name: 'Pausar rotación de regiones' }));
  fireEvent.click(screen.getByRole('tab', { name: REGIONS[2].name }));
  act(() => vi.advanceTimersByTime(30000));
  expect(screen.getByText('Regional project 2')).toBeDefined();
  fireEvent.click(screen.getByRole('button', { name: 'Reanudar rotación de regiones' }));
  act(() => vi.advanceTimersByTime(12100));
  expect(screen.getByText('Regional project 3')).toBeDefined();
});

test('focus does not pause rotation and leaving a clicked card resumes without clicking elsewhere', () => {
  render(<RegionExplorer regions={REGIONS} year={2026} />);
  const control = screen.getByRole('button', { name: 'Next project' });
  act(() => control.focus());
  act(() => vi.advanceTimersByTime(12100));
  expect(screen.getByText('Regional project 1')).toBeDefined();
  const region = screen.getByRole('tab', { name: REGIONS[2].name });
  act(() => region.focus());
  fireEvent.click(region);
  fireEvent.pointerEnter(region, { pointerType: 'mouse' });
  act(() => vi.advanceTimersByTime(30000));
  expect(screen.getByText('Regional project 2')).toBeDefined();
  fireEvent.pointerLeave(region, { pointerType: 'mouse' });
  act(() => vi.advanceTimersByTime(12100));
  expect(screen.getByText('Regional project 3')).toBeDefined();
  expect(document.activeElement).toBe(region);
});

test('responds to reduced-motion changes while the page is open', () => {
  render(<RegionExplorer regions={REGIONS} year={2026} />);
  act(() => vi.advanceTimersByTime(5000));
  act(() => {
    Object.defineProperty(motionPreference, 'matches', { value: true });
    motionPreference.dispatchEvent(new Event('change'));
  });
  act(() => vi.advanceTimersByTime(30000));
  expect(screen.getByText('Regional project 0')).toBeDefined();
  act(() => {
    Object.defineProperty(motionPreference, 'matches', { value: false });
    motionPreference.dispatchEvent(new Event('change'));
  });
  act(() => vi.advanceTimersByTime(7200));
  expect(screen.getByText('Regional project 1')).toBeDefined();
});

function FooterRegionLink() {
  const navigation = usePublicGeography();
  return (
    <button type="button" onClick={() => navigation?.selectGeography('north-america')}>
      Choose northern region
    </button>
  );
}

test('selecting a region through the footer does not activate the manual pause', () => {
  render(
    <PublicGeographyProvider>
      <FooterRegionLink />
      <RegionExplorer regions={REGIONS} year={2026} />
    </PublicGeographyProvider>
  );
  fireEvent.click(screen.getByRole('button', { name: 'Choose northern region' }));
  expect(screen.getByText('Regional project 2')).toBeDefined();
  expect(screen.getByRole('button', { name: 'Pausar rotación de regiones' })).toBeDefined();
  act(() => vi.advanceTimersByTime(12100));
  expect(screen.getByText('Regional project 3')).toBeDefined();
});
