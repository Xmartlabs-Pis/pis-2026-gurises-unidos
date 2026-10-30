'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

type UseUrlFiltersOptions = {
  search?: string;
  searchKey?: string;
  debounceMs?: number;
  resetKeys?: string[];
};

export function useUrlFilters({
  search,
  searchKey = 'search',
  debounceMs = 300,
  resetKeys = [],
}: UseUrlFiltersOptions = {}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [searchText, setSearchText] = useState(search ?? '');
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const requestedParams = useRef(searchParams.toString());

  useEffect(() => () => clearTimeout(searchTimeout.current), []);

  useEffect(() => {
    const requestedSearch =
      new URLSearchParams(requestedParams.current).get(searchKey) ?? undefined;
    if (search === requestedSearch) return;
    clearTimeout(searchTimeout.current);
    setSearchText(search ?? '');
  }, [search, searchKey]);

  useEffect(() => {
    requestedParams.current = searchParams.toString();
  }, [searchParams]);

  function updateFilters(updates: Record<string, string | null>) {
    const params = new URLSearchParams(requestedParams.current);
    for (const [key, value] of Object.entries(updates)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    for (const key of resetKeys) params.delete(key);
    const query = params.toString();
    requestedParams.current = query;
    startTransition(() =>
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    );
  }

  function clearFilters(keys: string[]) {
    updateFilters(Object.fromEntries(keys.map((key) => [key, null])));
  }

  function changeSearch(value: string) {
    setSearchText(value);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(
      () => updateFilters({ [searchKey]: value.trim() || null }),
      debounceMs
    );
  }

  return { searchText, changeSearch, updateFilters, clearFilters, isPending };
}
