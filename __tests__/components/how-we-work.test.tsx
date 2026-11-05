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

test('only the image and individual cards pause changes on hover, not the section background', () => {
  render(<HowWeWork />);
  const image = screen.getByRole('tabpanel');
  const section = image.parentElement!;
  fireEvent.pointerEnter(section, { pointerType: 'mouse' });
  advance(12100);
  expect(selectedTitle()).toContain('Familiar');
  fireEvent.pointerEnter(image, { pointerType: 'mouse' });
  advance(30000);
  expect(selectedTitle()).toContain('Familiar');
  fireEvent.pointerLeave(image, { pointerType: 'mouse' });
  const card = screen.getByRole('tab', { name: 'Familiar' });
  fireEvent.pointerEnter(card, { pointerType: 'mouse' });
  advance(30000);
  expect(selectedTitle()).toContain('Familiar');
  fireEvent.pointerLeave(card, { pointerType: 'mouse' });
  advance(12100);
  expect(selectedTitle()).toContain('Institucional');
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
