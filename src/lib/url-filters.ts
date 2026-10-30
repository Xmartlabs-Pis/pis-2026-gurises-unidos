import { redirect } from 'next/navigation';

export type RawSearchParams = Record<string, string | string[] | undefined>;

export type CanonicalQuery = Record<string, string | number | undefined>;

export function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function toSortedParams(entries: [string, string][]) {
  const params = new URLSearchParams(entries);
  params.sort();
  return params;
}

export function buildCanonicalQuery(canonical: CanonicalQuery) {
  return toSortedParams(
    Object.entries(canonical).flatMap(([key, value]): [string, string][] =>
      value === undefined || value === '' ? [] : [[key, String(value)]]
    )
  ).toString();
}

export function isCanonical(raw: RawSearchParams, canonical: CanonicalQuery) {
  const current = toSortedParams(
    Object.entries(raw).flatMap(([key, value]) =>
      [value]
        .flat()
        .flatMap((item): [string, string][] => (item === undefined ? [] : [[key, item]]))
    )
  );
  return current.toString() === buildCanonicalQuery(canonical);
}

export function redirectToCanonical(
  pathname: string,
  raw: RawSearchParams,
  canonical: CanonicalQuery
) {
  if (isCanonical(raw, canonical)) return;
  const query = buildCanonicalQuery(canonical);
  redirect(query ? `${pathname}?${query}` : pathname);
}
