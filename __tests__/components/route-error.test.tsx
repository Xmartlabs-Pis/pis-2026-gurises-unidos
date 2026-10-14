import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import RouteError from '@/components/route-error';
import PublicError from '@/app/(public)/error';

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  errorSpy.mockRestore();
});

function homeLink() {
  return screen.getByRole('link', { name: 'Volver al inicio' });
}

test('sends the home link to the dashboard by default', () => {
  render(<RouteError error={new Error('failed')} retry={() => {}} />);

  expect(homeLink().getAttribute('href')).toBe('/dashboard');
});

test('sends public errors home to the public site', () => {
  render(<PublicError error={new Error('failed')} retry={() => {}} />);

  expect(homeLink().getAttribute('href')).toBe('/');
});
