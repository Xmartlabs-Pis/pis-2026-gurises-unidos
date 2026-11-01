import { formatNumber } from '@/lib/format';

const LONG_DATE_FORMAT = new Intl.DateTimeFormat('es-UY', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'America/Montevideo',
});

const PERCENT_FORMAT = new Intl.NumberFormat('es-UY', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});

export type DeltaStyle = 'percent' | 'count';

export function formatLongDate(date: Date) {
  return LONG_DATE_FORMAT.format(date);
}

export function formatDelta(
  current: number,
  previous: number | null,
  previousYear: number,
  style: DeltaStyle
) {
  if (previous === null || previous === 0) return null;
  const difference = current - previous;
  if (difference === 0) return `Igual que en ${previousYear}`;
  const reference = `${previousYear} (${formatNumber(previous)})`;

  if (style === 'count') {
    const direction = difference > 0 ? 'más' : 'menos';
    return `${formatNumber(Math.abs(difference))} ${direction} que en ${reference}`;
  }

  const percent = (difference / previous) * 100;
  const sign = percent > 0 ? '+' : '−';
  return `${sign}${PERCENT_FORMAT.format(Math.abs(percent))} % frente a ${reference}`;
}

export function toFileNameSegment(value: string) {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
