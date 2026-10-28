import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { ACCESS_DENIED_ROUTE, canAccessRoute } from '@/lib/auth/route-access';
import {
  getSessionExpirationTimestamp,
  hasSessionExpired,
  SESSION_EXPIRATION_COOKIE,
  SESSION_EXPIRATION_COOKIE_OPTIONS,
  SESSION_EXPIRATION_REASON,
} from '@/lib/auth/session-expiration';

const PUBLIC_ROUTES = ['/', '/login', '/forgot-password', '/reset-password', '/accept-invitation'];
const PASSWORD_RESET_ROUTE = '/password-reset';
const EMBED_ROUTE = '/embed';

function isPublicRoute(pathname: string) {
  return PUBLIC_ROUTES.includes(pathname);
}

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;

  if (pathname === EMBED_ROUTE) {
    const response = NextResponse.next();
    response.headers.set(
      'Content-Security-Policy',
      `frame-ancestors ${process.env.EMBED_FRAME_ANCESTORS || "'none'"}`
    );
    return response;
  }

  const mustChangePassword = request.auth?.user?.mustChangePassword === true;

  if (mustChangePassword && pathname !== PASSWORD_RESET_ROUTE) {
    return NextResponse.redirect(new URL(PASSWORD_RESET_ROUTE, request.nextUrl));
  }

  if (request.auth && !mustChangePassword && pathname === PASSWORD_RESET_ROUTE) {
    return NextResponse.redirect(new URL('/dashboard', request.nextUrl));
  }

  if (request.auth) {
    const response = canAccessRoute(pathname, request.auth.user.role)
      ? NextResponse.next()
      : NextResponse.rewrite(new URL(ACCESS_DENIED_ROUTE, request.nextUrl));
    response.cookies.set(
      SESSION_EXPIRATION_COOKIE,
      String(getSessionExpirationTimestamp(Boolean(request.auth.user.remember))),
      SESSION_EXPIRATION_COOKIE_OPTIONS
    );
    return response;
  }

  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const loginUrl = new URL('/login', request.nextUrl);
  const expirationCookie = request.cookies.get(SESSION_EXPIRATION_COOKIE)?.value;

  if (hasSessionExpired(expirationCookie)) {
    loginUrl.searchParams.set('reason', SESSION_EXPIRATION_REASON);
  }

  const response = NextResponse.redirect(loginUrl);

  if (expirationCookie) {
    response.cookies.delete(SESSION_EXPIRATION_COOKIE);
  }

  return response;
});

export const config = {
  matcher: [
    '/((?!api/auth(?:/|$)|_next/static/|_next/image$|images/project-placeholders/|uploads/covers/|favicon\\.ico$|robots\\.txt$|sitemap\\.xml$|manifest\\.webmanifest$|(?:.+/)?(?:icon|apple-icon|opengraph-image|twitter-image)\\d*(?:\\.\\w+)?$).*)',
  ],
};
