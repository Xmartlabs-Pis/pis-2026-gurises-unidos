import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { ErrorBoundary } from '@/components/error-boundary';

function ErrorThrow(): never {
  throw new Error('error');
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

test('renders children when nothing throws', () => {
  render(
    <ErrorBoundary fallback={<p>fallback</p>}>
      <p>content</p>
    </ErrorBoundary>
  );

  expect(screen.getByText('content')).toBeDefined();
  expect(screen.queryByText('fallback')).toBeNull();
});

test('replaces every child with the fallback when one of them throws during render', () => {
  render(
    <ErrorBoundary fallback={<p>fallback</p>}>
      <p>content</p>
      <ErrorThrow />
    </ErrorBoundary>
  );

  expect(screen.getByText('fallback')).toBeDefined();
  expect(screen.queryByText('content')).toBeNull();
});
