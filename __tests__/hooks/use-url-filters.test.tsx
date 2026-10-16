import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useUrlFilters } from '@/hooks/use-url-filters';

const mocks = vi.hoisted(() => ({
  searchParams: new URLSearchParams(),
  replace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => mocks.searchParams,
  usePathname: () => '/list',
  useRouter: () => ({ replace: mocks.replace }),
}));

beforeEach(() => {
  mocks.searchParams = new URLSearchParams();
  mocks.replace.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

test('sets and removes params keeping the others', () => {
  mocks.searchParams = new URLSearchParams('status=active&topicId=1');
  const { result } = renderHook(() => useUrlFilters());

  act(() => result.current.updateFilters({ status: 'inactive', topicId: null }));

  expect(mocks.replace).toHaveBeenCalledWith('/list?status=inactive', { scroll: false });
});

test('navigates to the bare path when no param is left', () => {
  mocks.searchParams = new URLSearchParams('role=admin');
  const { result } = renderHook(() => useUrlFilters());

  act(() => result.current.updateFilters({ role: '' }));

  expect(mocks.replace).toHaveBeenCalledWith('/list', { scroll: false });
});

test('drops reset keys on every update', () => {
  mocks.searchParams = new URLSearchParams('page=3&status=active');
  const { result } = renderHook(() => useUrlFilters({ resetKeys: ['page'] }));

  act(() => result.current.updateFilters({ status: 'inactive' }));

  expect(mocks.replace).toHaveBeenCalledWith('/list?status=inactive', { scroll: false });
});

test('clears the given keys only', () => {
  mocks.searchParams = new URLSearchParams('q=ana&role=admin&sort=role');
  const { result } = renderHook(() => useUrlFilters({ searchKey: 'q' }));

  act(() => result.current.clearFilters(['role', 'sort']));

  expect(mocks.replace).toHaveBeenCalledWith('/list?q=ana', { scroll: false });
});

test('chains consecutive updates before the url catches up', () => {
  const { result } = renderHook(() => useUrlFilters());

  act(() => result.current.updateFilters({ status: 'inactive' }));
  act(() => result.current.updateFilters({ topicId: '2' }));

  expect(mocks.replace).toHaveBeenLastCalledWith('/list?status=inactive&topicId=2', {
    scroll: false,
  });
});

test('debounces the search and trims it', () => {
  vi.useFakeTimers();
  const { result } = renderHook(() => useUrlFilters({ searchKey: 'q', debounceMs: 300 }));

  act(() => result.current.changeSearch('  an'));
  act(() => result.current.changeSearch('  ana  '));
  expect(result.current.searchText).toBe('  ana  ');
  expect(mocks.replace).not.toHaveBeenCalled();

  act(() => vi.advanceTimersByTime(300));

  expect(mocks.replace).toHaveBeenCalledTimes(1);
  expect(mocks.replace).toHaveBeenCalledWith('/list?q=ana', { scroll: false });
});

test('removes the search param when the text is blank', () => {
  vi.useFakeTimers();
  mocks.searchParams = new URLSearchParams('search=centro');
  const { result } = renderHook(() => useUrlFilters({ search: 'centro' }));

  act(() => result.current.changeSearch('   '));
  act(() => vi.advanceTimersByTime(300));

  expect(mocks.replace).toHaveBeenCalledWith('/list', { scroll: false });
});

test('cancels the pending search on unmount', () => {
  vi.useFakeTimers();
  const { result, unmount } = renderHook(() => useUrlFilters());

  act(() => result.current.changeSearch('ana'));
  unmount();
  vi.advanceTimersByTime(300);

  expect(mocks.replace).not.toHaveBeenCalled();
});

test('syncs the search text when it changes from outside', () => {
  mocks.searchParams = new URLSearchParams('search=centro');
  const { result, rerender } = renderHook(({ search }) => useUrlFilters({ search }), {
    initialProps: { search: 'centro' as string | undefined },
  });

  rerender({ search: undefined });

  expect(result.current.searchText).toBe('');
});
