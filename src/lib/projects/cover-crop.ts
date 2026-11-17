export type CoverCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const MAX_PERCENT = 100;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clampPercent(value: number) {
  return Math.min(MAX_PERCENT, Math.max(0, value));
}

function roundPercent(value: number) {
  return Math.round(value * 10000) / 10000;
}

export function parseCoverCrop(value: unknown): CoverCrop | null {
  const raw = typeof value === 'string' ? parseCropJson(value) : value;
  if (typeof raw !== 'object' || raw === null) return null;
  if (!('x' in raw) || !('y' in raw) || !('width' in raw) || !('height' in raw)) return null;
  const { x, y, width, height } = raw;
  if (
    !isFiniteNumber(x) ||
    !isFiniteNumber(y) ||
    !isFiniteNumber(width) ||
    !isFiniteNumber(height)
  ) {
    return null;
  }

  const crop = {
    x: roundPercent(clampPercent(x)),
    y: roundPercent(clampPercent(y)),
    width: roundPercent(clampPercent(width)),
    height: roundPercent(clampPercent(height)),
  };
  if (crop.width <= 0 || crop.height <= 0) return null;
  if (crop.x + crop.width > MAX_PERCENT + 0.5 || crop.y + crop.height > MAX_PERCENT + 0.5) {
    return null;
  }
  if (crop.x + crop.width > MAX_PERCENT) crop.width = roundPercent(MAX_PERCENT - crop.x);
  if (crop.y + crop.height > MAX_PERCENT) crop.height = roundPercent(MAX_PERCENT - crop.y);
  if (crop.width <= 0 || crop.height <= 0) return null;
  return crop;
}

function parseCropJson(value: string) {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return null;
  }
}

export function coverCropFromForm(formData: FormData): CoverCrop | undefined {
  const value = formData.get('coverCrop');
  if (typeof value !== 'string' || value.length === 0) return undefined;
  return parseCoverCrop(value) ?? undefined;
}

export function sameCoverCrop(crop: CoverCrop | null, previous: unknown) {
  const parsed = parseCoverCrop(previous);
  if (!crop || !parsed) return !crop && !parsed;
  return (
    crop.x === parsed.x &&
    crop.y === parsed.y &&
    crop.width === parsed.width &&
    crop.height === parsed.height
  );
}

export function coverCropStyle(crop: CoverCrop): {
  width: string;
  height: string;
  left: string;
  top: string;
} {
  return {
    width: percent((MAX_PERCENT / crop.width) * MAX_PERCENT),
    height: percent((MAX_PERCENT / crop.height) * MAX_PERCENT),
    left: percent((-crop.x / crop.width) * MAX_PERCENT),
    top: percent((-crop.y / crop.height) * MAX_PERCENT),
  };
}

export function coverCropSizes(sizes: string, crop: CoverCrop) {
  const scale = MAX_PERCENT / crop.width;
  if (scale <= 1) return sizes;
  return sizes
    .split(',')
    .map((entry) => {
      const value = entry.trim();
      const conditionEnd = value.lastIndexOf(') ');
      const condition = conditionEnd === -1 ? '' : value.slice(0, conditionEnd + 2);
      const length = conditionEnd === -1 ? value : value.slice(conditionEnd + 2);
      return `${condition}calc(${length} * ${roundPercent(scale)})`;
    })
    .join(', ');
}

function percent(value: number) {
  return `${roundPercent(value)}%`;
}
