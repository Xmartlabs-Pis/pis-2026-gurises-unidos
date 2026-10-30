import { describe, expect, test } from 'vitest';
import { getAvatarColorClassName, getAvatarColorIndex } from '@/lib/users/avatar';
import { AVATAR_COLOR_CLASSNAMES } from '@/lib/users/constants';

describe('getAvatarColorIndex', () => {
  test.each(Array.from({ length: 10 }, (_, digit) => digit))(
    'maps verification digit %i to its color index',
    (digit) => {
      expect(getAvatarColorIndex(`4123456${digit}`)).toBe(digit);
    }
  );

  test('supports formatted document ids', () => {
    expect(getAvatarColorIndex('4.123.456-7')).toBe(7);
  });

  test('falls back to the first color for an invalid document id', () => {
    expect(getAvatarColorIndex('invalid')).toBe(0);
  });
});

describe('getAvatarColorClassName', () => {
  test.each(Array.from({ length: 10 }, (_, index) => index))(
    'returns the palette entry for index %i',
    (index) => {
      expect(getAvatarColorClassName(index)).toBe(AVATAR_COLOR_CLASSNAMES[index]);
    }
  );

  test('falls back to the first color when the index is unavailable', () => {
    expect(getAvatarColorClassName(undefined)).toBe(AVATAR_COLOR_CLASSNAMES[0]);
  });
});
