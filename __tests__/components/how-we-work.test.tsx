import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { HowWeWork } from '@/components/how-we-work';

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
    advance(9100);
    expect(selectedTitle()).toContain(title);
  }
});

test('manual selection updates the image panel and restarts the duration', () => {
  render(<HowWeWork />);
  advance(5000);
  fireEvent.click(screen.getByRole('tab', { name: 'Comunitario' }));
  expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe('work-level-3');
  advance(6000);
  expect(selectedTitle()).toContain('Comunitario');
  advance(3200);
  expect(selectedTitle()).toContain('Individual');
});

test('supports keyboard selection and moves focus to the chosen level', () => {
  render(<HowWeWork />);
  fireEvent.keyDown(screen.getByRole('tab', { name: 'Individual' }), { key: 'End' });
  expect(selectedTitle()).toContain('Comunitario');
  expect(document.activeElement).toBe(screen.getByRole('tab', { name: 'Comunitario' }));
  fireEvent.keyDown(document.activeElement!, { key: 'ArrowDown' });
  expect(selectedTitle()).toContain('Individual');
});
