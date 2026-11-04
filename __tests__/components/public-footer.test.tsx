import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { PublicFooter } from '@/components/public-footer';

const navigation = vi.hoisted(() => ({ push: vi.fn(), pathname: '/' }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: navigation.push }),
  usePathname: () => navigation.pathname,
  useSearchParams: () => new URLSearchParams('year=2025'),
}));

const TOPICS = Array.from({ length: 6 }, (_, index) => ({
  id: index + 1,
  name: `Topic ${index + 1}`,
}));
const YEARS = [2026, 2025, 2024, 2023, 2022, 2021];

beforeEach(() => {
  vi.clearAllMocks();
  navigation.pathname = '/';
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false }))
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

test('shows all five entries without a view-all control when neither list exceeds the limit', () => {
  render(<PublicFooter topics={TOPICS.slice(0, 5)} years={YEARS.slice(0, 5)} year={2025} />);
  expect(screen.queryAllByText('Ver todos')).toHaveLength(0);
  expect(screen.getByRole('link', { name: 'Topic 5' })).toBeDefined();
  expect(screen.getByRole('link', { name: '2022' })).toBeDefined();
});

test('limits both lists to four entries followed by a view-all control', () => {
  render(<PublicFooter topics={TOPICS} years={YEARS} year={2025} />);
  const lists = screen.getAllByRole('list');
  expect(within(lists[0]).getAllByRole('listitem')).toHaveLength(5);
  expect(within(lists[1]).getAllByRole('listitem')).toHaveLength(5);
  expect(screen.queryByRole('link', { name: 'Topic 5' })).toBeNull();
  expect(screen.queryByRole('link', { name: '2022' })).toBeNull();
  expect(within(lists[0]).getByRole('link', { name: 'Ver todos' }).getAttribute('href')).toBe(
    '/projects?year=2025'
  );
});

test('viewing all years scrolls to the selector without navigating or changing the selected year', () => {
  render(<PublicFooter topics={TOPICS} years={YEARS} year={2025} />);
  fireEvent.click(
    within(screen.getByRole('navigation', { name: 'Informes anuales' })).getByRole('button', {
      name: 'Ver todos',
    })
  );
  expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  expect(navigation.push).not.toHaveBeenCalled();
  expect(screen.getByRole('link', { name: '2025' }).getAttribute('aria-current')).toBe('true');
});

test('viewing all topics from the listing scrolls to its top', () => {
  navigation.pathname = '/projects';
  render(<PublicFooter topics={TOPICS} years={YEARS} year={2025} />);
  fireEvent.click(screen.getByRole('link', { name: 'Ver todos' }));
  expect(window.scrollTo).toHaveBeenCalledWith(expect.objectContaining({ top: 0 }));
  expect(navigation.push).not.toHaveBeenCalled();
});
