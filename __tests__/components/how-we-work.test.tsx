import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { HowWeWork } from '@/components/how-we-work';

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

test.each([
  { title: 'Individual', photos: [8] },
  { title: 'Familiar', photos: [1, 5] },
  { title: 'Institucional', photos: [2, 3, 7] },
  { title: 'Comunitario', photos: [4, 6] },
])('cycles only through assigned photos for $title', ({ title, photos }) => {
  render(<HowWeWork />);

  for (const number of [...photos, ...photos]) {
    fireEvent.click(screen.getByRole('tab', { name: title }));
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
  const card = screen.getByRole('tab', { name: 'Comunitario' });
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
  fireEvent.click(screen.getByRole('tab', { name: 'Familiar' }));
  expect(selectedTitle()).toContain('Familiar');
  advance(30000);
  expect(selectedTitle()).toContain('Familiar');
});

test('supports keyboard selection and moves focus to the chosen level', () => {
  render(<HowWeWork />);
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Individual' }), { key: 'End' });
  expect(selectedTitle()).toContain('Comunitario');
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Comunitario' }));
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
  const card = screen.getByRole('tab', { name: 'Institucional' });
  fireEvent.pointerEnter(card, { pointerType: 'mouse' });
  advance(30000);
  expect(selectedTitle()).toContain('Institucional');
  fireEvent.pointerLeave(card, { pointerType: 'mouse' });
  advance(12100);
  expect(selectedTitle()).toContain('Comunitario');
});

test('hovering a collapsed work-level card does not pause or change the playback button', () => {
  render(<HowWeWork />);
  fireEvent.pointerEnter(screen.getByRole('tab', { name: 'Comunitario' }), {
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
