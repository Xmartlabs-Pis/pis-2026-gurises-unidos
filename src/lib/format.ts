export function formatNumber(value: number) {
  return value.toLocaleString('es-UY');
}

export function formatIncrement(current: number, previous: number, previousYear: number) {
  if (previous === 0) return null;
  const change = Math.round(((current - previous) / previous) * 100);
  return `${change > 0 ? '+' : ''}${change}% vs. ${previousYear}`;
}
