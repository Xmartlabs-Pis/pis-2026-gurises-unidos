export const MAX_INT32 = 2_147_483_647;

export function parseId(value: unknown): number | null {
  if (typeof value !== 'number' && (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)))
    return null;
  const id = Number(value);
  return Number.isInteger(id) && id > 0 && id <= MAX_INT32 ? id : null;
}
