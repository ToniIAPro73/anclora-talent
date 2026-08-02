import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const getSessionUserMock = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: getSessionUserMock,
  SESSION_COOKIE_NAME: 'anclora_session',
}));

function buildRequest(withCookie = true) {
  const headers = new Headers();
  if (withCookie) headers.set('cookie', 'anclora_session=token-abc');
  return new NextRequest('https://example.com/api/auth/me', { headers });
}

describe('GET /api/auth/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns 401 without a session cookie', async () => {
    const { GET } = await import('./route');
    const response = await GET(buildRequest(false));

    expect(response.status).toBe(401);
    expect(getSessionUserMock).not.toHaveBeenCalled();
  });

  test('returns 401 when the session is expired or unknown', async () => {
    getSessionUserMock.mockResolvedValue(null);
    const { GET } = await import('./route');
    const response = await GET(buildRequest());

    expect(response.status).toBe(401);
    expect(getSessionUserMock).toHaveBeenCalledWith('token-abc');
  });

  test('returns the current user for a valid session', async () => {
    const user = { id: 'user-1', email: 'user@example.com', fullName: 'Test User' };
    getSessionUserMock.mockResolvedValue(user);
    const { GET } = await import('./route');
    const response = await GET(buildRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ user });
  });
});
