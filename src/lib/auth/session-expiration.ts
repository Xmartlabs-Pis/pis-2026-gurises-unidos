export const SESSION_MAX_AGE = 12 * 60 * 60;
export const REMEMBER_ME_MAX_AGE = 30 * 24 * 60 * 60;
export const SESSION_EXPIRATION_COOKIE_MAX_AGE = REMEMBER_ME_MAX_AGE + 24 * 60 * 60;
export const SESSION_EXPIRATION_COOKIE = 'session_expires_at';
export const SESSION_EXPIRATION_REASON = 'session-expired';
export const SESSION_EXPIRATION_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/',
  maxAge: SESSION_EXPIRATION_COOKIE_MAX_AGE,
} as const;

export function getSessionMaxAge(remember: boolean) {
  return remember ? REMEMBER_ME_MAX_AGE : SESSION_MAX_AGE;
}

export function getSessionExpirationTimestamp(remember: boolean, now = Date.now()) {
  return now + getSessionMaxAge(remember) * 1000;
}

export function hasSessionExpired(value: string | undefined, now = Date.now()) {
  if (!value) return false;

  const expiresAt = Number(value);
  return Number.isFinite(expiresAt) && expiresAt <= now;
}
