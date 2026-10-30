import { describe, expect, test } from 'vitest';
import { getInitials, normalizeDocumentId } from '@/lib/utils';

describe('getInitials', () => {
  test('returns the first letter of the first two words', () => {
    expect(getInitials('Ada Lovelace')).toBe('AL');
  });

  test('returns a single initial when there is one word', () => {
    expect(getInitials('Ada')).toBe('A');
  });

  test('ignores extra words beyond the first two', () => {
    expect(getInitials('Ada Augusta Lovelace')).toBe('AA');
  });

  test('returns an empty string for blank values', () => {
    expect(getInitials('')).toBe('');
    expect(getInitials('   ')).toBe('');
    expect(getInitials(null)).toBe('');
    expect(getInitials(undefined)).toBe('');
  });

  test('uppercases the initials', () => {
    expect(getInitials('ada lovelace')).toBe('AL');
  });
});

describe('normalizeDocumentId', () => {
  test.each([
    ['4.123.456-7', '41234567'],
    ['4 123 456 7', '41234567'],
    ['4. 123.456- 7', '41234567'],
    ['41234567', '41234567'],
    ['', ''],
    ['  4123  4567  ', '41234567'],
    ['41234567A', '41234567A'],
    ['4.123.456\u20137', '4123456\u20137'],
    ['4.123.456\u20147', '4123456\u20147'],
  ])('normalizes %j to %j', (input, expected) => {
    expect(normalizeDocumentId(input)).toBe(expected);
  });
});
