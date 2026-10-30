import { describe, expect, test } from 'vitest';
import {
  getSessionExpirationTimestamp,
  getSessionMaxAge,
  hasSessionExpired,
  REMEMBER_ME_MAX_AGE,
  SESSION_MAX_AGE,
} from '@/lib/auth/session-expiration';

describe('session expiration', () => {
  test('uses the 12-hour lifetime by default', () => {
    expect(getSessionMaxAge(false)).toBe(SESSION_MAX_AGE);
    expect(getSessionExpirationTimestamp(false, 1_000)).toBe(1_000 + SESSION_MAX_AGE * 1000);
  });

  test('uses the 30-day lifetime when remember is enabled', () => {
    expect(getSessionMaxAge(true)).toBe(REMEMBER_ME_MAX_AGE);
    expect(getSessionExpirationTimestamp(true, 1_000)).toBe(1_000 + REMEMBER_ME_MAX_AGE * 1000);
  });

  test('only treats valid elapsed timestamps as expired', () => {
    expect(hasSessionExpired('999', 1_000)).toBe(true);
    expect(hasSessionExpired('1001', 1_000)).toBe(false);
    expect(hasSessionExpired('invalid', 1_000)).toBe(false);
    expect(hasSessionExpired(undefined, 1_000)).toBe(false);
  });
});
