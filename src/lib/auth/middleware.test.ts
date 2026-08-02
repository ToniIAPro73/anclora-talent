import { describe, expect, test } from 'vitest';
import { NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME } from './constants';
import { hasSessionCookie, isProtectedPath, protectRequest } from './middleware';

function buildRequest(pathname: string, withSession = false) {
  const headers = new Headers();
  if (withSession) {
    headers.set('cookie', `${SESSION_COOKIE_NAME}=opaque-token`);
  }
  return new NextRequest(`https://example.com${pathname}`, { headers });
}

describe('isProtectedPath', () => {
  test.each([
    '/dashboard',
    '/dashboard/stats',
    '/projects',
    '/projects/abc/editor',
    '/api/blob',
    '/api/blob/upload',
    '/api/projects/export',
  ])('protects %s', (pathname) => {
    expect(isProtectedPath(pathname)).toBe(true);
  });

  test.each(['/', '/sign-in', '/sign-up', '/terms', '/api/auth/login', '/api/auth/register'])(
    'does not protect %s',
    (pathname) => {
      expect(isProtectedPath(pathname)).toBe(false);
    },
  );
});

describe('hasSessionCookie', () => {
  test('returns false without the session cookie', () => {
    expect(hasSessionCookie(buildRequest('/dashboard'))).toBe(false);
  });

  test('returns true when the session cookie is present', () => {
    expect(hasSessionCookie(buildRequest('/dashboard', true))).toBe(true);
  });
});

describe('protectRequest', () => {
  test('lets public routes through without a session', () => {
    const response = protectRequest(buildRequest('/sign-in'));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });

  test('redirects unauthenticated page requests to sign-in', () => {
    const response = protectRequest(buildRequest('/dashboard'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://example.com/sign-in');
  });

  test('redirects nested protected pages to sign-in', () => {
    const response = protectRequest(buildRequest('/projects/any-id/editor'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://example.com/sign-in');
  });

  test('returns 401 for unauthenticated protected API calls', async () => {
    const response = protectRequest(buildRequest('/api/blob/upload'));
    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'Unauthorized' });
  });

  test('lets requests with a session cookie through', () => {
    const response = protectRequest(buildRequest('/dashboard', true));
    expect(response.status).toBe(200);
    expect(response.headers.get('location')).toBeNull();
  });
});
