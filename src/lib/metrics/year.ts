const YEAR_FORMAT = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  timeZone: 'America/Montevideo',
});

export function getCurrentYear(now = new Date()) {
  return Number(YEAR_FORMAT.format(now));
}

export function resolveYearParam(
  value: string | string[] | undefined,
  years: number[],
  fallback: number
) {
  const parsed = typeof value === 'string' ? Number(value) : NaN;
  return Number.isInteger(parsed) && years.includes(parsed) ? parsed : fallback;
}
