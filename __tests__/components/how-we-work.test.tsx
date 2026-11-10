import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { HowWeWork } from '@/components/how-we-work';

function tab(title: string) {
  return screen.getByRole('tab', { name: new RegExp(`^${title}`) });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
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

function advance(milliseconds: number) {
  act(() => vi.advanceTimersByTime(milliseconds));
}

function selectedTitle() {
  return screen.getAllByRole('tab').find((tab) => tab.getAttribute('aria-selected') === 'true')
    ?.textContent;
}

test('defers unvisited photos and keeps the previous image visible while the next loads', () => {
  render(<HowWeWork />);
  const initialPhoto = screen.getByRole('img');
  expect(screen.getByRole('tabpanel').querySelectorAll('img')).toHaveLength(1);

  fireEvent.click(tab('Familiar'));

  expect(screen.getByRole('tabpanel').querySelectorAll('img')).toHaveLength(2);
  expect(initialPhoto.className).toContain('opacity-100');
  expect(screen.getByRole('img').className).toContain('opacity-0');
});

test('shows a previously loaded photo when returning to a tab without another load event', async () => {
  render(<HowWeWork />);
  const initialPhoto = screen.getByRole('img');
  await act(async () => fireEvent.load(initialPhoto));

  fireEvent.click(tab('Familiar'));
  const familyPhoto = screen.getByRole('img');
  await act(async () => fireEvent.load(familyPhoto));
  expect(familyPhoto.className).toContain('opacity-100');

  fireEvent.click(tab('Individual'));

  expect(screen.getByRole('img')).toBe(initialPhoto);
  expect(initialPhoto.className).toContain('opacity-100');
  expect(familyPhoto.className).toContain('opacity-0');
});

test('shows cached family photos when their automatic rotation repeats', async () => {
  render(<HowWeWork />);
  const loadedPhotos = new Set<number>();

  for (const number of [8, 1, 2, 4, 8, 5, 3, 6, 8, 1, 7, 4, 8, 5]) {
    const image = screen.getByRole('img');
    expect(decodeURIComponent(image.getAttribute('src')!)).toContain(
      `/assets/how-we-work/how-we-work-${number}.webp`
    );
    if (!loadedPhotos.has(number)) {
      await act(async () => fireEvent.load(image));
      loadedPhotos.add(number);
    }
    expect(image.className).toContain('opacity-100');
    advance(12100);
  }
});

test.each([
  { title: 'Individual', photos: [8] },
  { title: 'Familiar', photos: [1, 5] },
  { title: 'Institucional', photos: [2, 3, 7] },
  { title: 'Comunitario', photos: [4, 6] },
])('cycles only through assigned photos for $title', ({ title, photos }) => {
  render(<HowWeWork />);

  for (const number of [...photos, ...photos]) {
    fireEvent.click(tab(title));
    const image = screen.getByRole('img');
    expect(decodeURIComponent(image.getAttribute('src')!)).toContain(
      `/assets/how-we-work/how-we-work-${number}.webp`
    );
    expect(image.getAttribute('alt')).toBeTruthy();
    fireEvent.keyDown(screen.getByRole('tab', { selected: true }), { key: 'ArrowDown' });
  }
});

test('automatically rotates categories and advances their assigned photos on each visit', () => {
  render(<HowWeWork />);

  for (const number of [8, 1, 2, 4, 8, 5, 3, 6, 8, 1, 7, 4]) {
    expect(decodeURIComponent(screen.getByRole('img').getAttribute('src')!)).toContain(
      `/assets/how-we-work/how-we-work-${number}.webp`
    );
    advance(12100);
  }
});

test('automatically visits all four levels and loops to the first', () => {
  render(<HowWeWork />);
  expect(selectedTitle()).toContain('Individual');
  for (const title of ['Familiar', 'Institucional', 'Comunitario', 'Individual']) {
    const previousTitle = selectedTitle();
    advance(11900);
    expect(selectedTitle()).toBe(previousTitle);
    advance(200);
    expect(selectedTitle()).toContain(title);
  }
});

test('manual selection updates the image panel and restarts the timer without changing the pause button', () => {
  render(<HowWeWork />);
  advance(5000);
  const card = tab('Comunitario');
  act(() => card.focus());
  fireEvent.click(card);
  expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe('work-level-3');
  expect(screen.getByRole('button', { name: 'Pausar rotación de Cómo trabajamos' })).toBeDefined();
  advance(11900);
  expect(selectedTitle()).toContain('Comunitario');
  advance(200);
  expect(selectedTitle()).toContain('Individual');
});

test('reduced motion disables automatic changes while keeping manual selection available', () => {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
  );
  render(<HowWeWork />);
  advance(30000);
  expect(selectedTitle()).toContain('Individual');
  fireEvent.click(tab('Familiar'));
  expect(selectedTitle()).toContain('Familiar');
  advance(30000);
  expect(selectedTitle()).toContain('Familiar');
});

test('supports keyboard selection and moves focus to the chosen level', () => {
  render(<HowWeWork />);
  fireEvent.keyDown(tab('Individual'), { key: 'End' });
  expect(selectedTitle()).toContain('Comunitario');
  expect(document.activeElement).toBe(tab('Comunitario'));
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
  expect(selectedTitle()).toContain('Individual');
});

test('hovering the image keeps progress running while active work-level cards pause it', () => {
  render(<HowWeWork />);
  const image = screen.getByRole('tabpanel');
  const section = image.parentElement!;
  fireEvent.pointerEnter(section, { pointerType: 'mouse' });
  advance(12100);
  expect(selectedTitle()).toContain('Familiar');
  fireEvent.pointerEnter(image, { pointerType: 'mouse' });
  const progress = section.querySelector<HTMLSpanElement>('span[style]')!;
  const before = progress.style.transform;
  advance(6000);
  expect(selectedTitle()).toContain('Familiar');
  expect(progress.style.transform).not.toBe(before);
  advance(6100);
  expect(selectedTitle()).toContain('Institucional');
  fireEvent.pointerLeave(image, { pointerType: 'mouse' });
  const card = tab('Institucional');
  fireEvent.pointerEnter(card, { pointerType: 'mouse' });
  advance(30000);
  expect(selectedTitle()).toContain('Institucional');
  fireEvent.pointerLeave(card, { pointerType: 'mouse' });
  advance(12100);
  expect(selectedTitle()).toContain('Comunitario');
});

test('hovering a collapsed work-level card does not pause or change the playback button', () => {
  render(<HowWeWork />);
  fireEvent.pointerEnter(tab('Comunitario'), {
    pointerType: 'mouse',
  });
  advance(12100);
  expect(selectedTitle()).toContain('Familiar');
  expect(
    screen
      .getByRole('button', { name: 'Pausar rotación de Cómo trabajamos' })
      .getAttribute('aria-pressed')
  ).toBe('false');
});

test('offers manual pause and play controls for the work levels', () => {
  render(<HowWeWork />);
  fireEvent.click(screen.getByRole('button', { name: 'Pausar rotación de Cómo trabajamos' }));
  advance(30000);
  expect(selectedTitle()).toContain('Individual');
  fireEvent.click(screen.getByRole('button', { name: 'Reanudar rotación de Cómo trabajamos' }));
  advance(12100);
  expect(selectedTitle()).toContain('Familiar');
});

test('names each level by its visible text', () => {
  render(<HowWeWork />);

  expect(screen.getByRole('tab', { selected: true }).getAttribute('aria-label')).toBeNull();
  expect(
    screen.getByRole('tab', {
      name: /^Individual\s*Niños, niñas, adolescentes y jóvenes: acompañamiento directo y personalizado\.$/,
    })
  ).toBeDefined();
  expect(screen.getByRole('tab', { name: 'Familiar' })).toBeDefined();
});
