import { NextRequest, NextResponse } from 'next/server';
import { SESSION_COOKIE_NAME } from './constants';
import { buildAbsoluteAppUrl } from './urls';

const PROTECTED_PATH_PATTERNS = [
  /^\/dashboard(\/.*)?$/,
  /^\/projects(\/.*)?$/,
  /^\/api\/projects(\/.*)?$/,
  /^\/api\/blob(\/.*)?$/,
];

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

export function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
}

export function redirectToSignIn(request: NextRequest): NextResponse {
  return NextResponse.redirect(buildAbsoluteAppUrl('/sign-in', { requestUrl: request.url }));
}

/**
 * Cookie-level route protection. The session token itself is validated
 * against the database in `requireUserId`; here we only gate on presence
 * so unauthenticated traffic never reaches the app shell.
 */
export function protectRequest(request: NextRequest): NextResponse {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (hasSessionCookie(request)) {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return redirectToSignIn(request);
}
