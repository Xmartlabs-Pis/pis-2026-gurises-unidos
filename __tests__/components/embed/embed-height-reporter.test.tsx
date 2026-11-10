import { render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { EmbedHeightReporter } from '@/components/embed/embed-height-reporter';

let notifyResize: () => void;

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      constructor(callback: () => void) {
        notifyResize = callback;
      }
      observe() {}
      disconnect() {}
    }
  );
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({
    height: 312.4,
  } as DOMRect);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

it('sends the content height to each allowed origin', () => {
  const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
  render(
    <EmbedHeightReporter origins={['https://gurisesunidos.org.uy', 'http://localhost:4100']}>
      <p>Impacto</p>
    </EmbedHeightReporter>
  );

  notifyResize();

  const message = { type: 'gurises-unidos:embed-height', height: 313 };
  expect(postMessage.mock.calls).toEqual([
    [message, 'https://gurisesunidos.org.uy'],
    [message, 'http://localhost:4100'],
  ]);
});

it('sends nothing when no origin is allowed', () => {
  const postMessage = vi.spyOn(window.parent, 'postMessage').mockImplementation(() => {});
  render(
    <EmbedHeightReporter origins={[]}>
      <p>Impacto</p>
    </EmbedHeightReporter>
  );

  notifyResize();

  expect(postMessage).not.toHaveBeenCalled();
});
