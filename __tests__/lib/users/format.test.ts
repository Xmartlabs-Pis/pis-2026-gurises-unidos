import { describe, expect, test } from 'vitest';
import { makeUser } from '../../fixtures/user';
import { formatDate, formatUserDate, formatUserCount, fullName } from '@/lib/users/format';

describe('fullName', () => {
  test('joins first and last name', () => {
    expect(fullName(makeUser({ firstName: 'Ada', lastName: 'Lovelace' }))).toBe('Ada Lovelace');
  });
});

describe('formatDate', () => {
  test('returns "Nunca" when the date is absent', () => {
    expect(formatDate(null)).toBe('Nunca');
  });

  test('formats the date as dd/mm/yyyy in the Montevideo timezone', () => {
    expect(formatDate(new Date('2026-03-05T12:00:00.000Z'))).toBe('05/03/2026');
  });
});

describe('formatUserDate', () => {
  test('returns a dash when there is no date', () => {
    expect(formatUserDate(null)).toBe('—');
  });

  test('formats the date as dd/mm/yyyy in the Montevideo timezone', () => {
    expect(formatUserDate(new Date('2026-09-18T12:00:00.000Z'))).toBe('18/09/2026');
  });
});

describe('formatUserCount', () => {
  test('returns a specific message for zero results', () => {
    expect(formatUserCount(0)).toBe('No hay resultados');
  });

  test('uses singular for one result', () => {
    expect(formatUserCount(1)).toBe('1 usuario');
  });

  test('uses plural for more than one result', () => {
    expect(formatUserCount(5)).toBe('5 usuarios');
  });
});
