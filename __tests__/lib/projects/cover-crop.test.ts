import { expect, it } from 'vitest';
import { coverCropStyle, parseCoverCrop, sameCoverCrop } from '@/lib/projects/cover-crop';

it('parses a crop rectangle inside the image', () => {
  expect(parseCoverCrop({ x: 10, y: 20, width: 50, height: 40 })).toEqual({
    x: 10,
    y: 20,
    width: 50,
    height: 40,
  });
});

it('rejects a crop that does not fit in the image', () => {
  expect(parseCoverCrop({ x: 80, y: 0, width: 40, height: 20 })).toBeNull();
  expect(parseCoverCrop('not-json')).toBeNull();
  expect(parseCoverCrop(null)).toBeNull();
});

it('treats a missing crop as the centered cover', () => {
  expect(sameCoverCrop(null, undefined)).toBe(true);
  expect(sameCoverCrop(null, { x: 0, y: 0, width: 100, height: 100 })).toBe(false);
});

it('turns the rectangle into a position that fills the frame', () => {
  expect(coverCropStyle({ x: 0, y: 25, width: 100, height: 50 })).toEqual({
    width: '100%',
    height: '200%',
    left: '0%',
    top: '-50%',
  });
});
