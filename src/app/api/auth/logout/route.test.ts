import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const deleteSessionMock = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  deleteSession: deleteSessionMock,
  SESSION_COOKIE_NAME: 'anclora_session',
  SESSION_COOKIE_OPTIONS: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' },
}));

function buildRequest(withCookie = true) {
  const headers = new Headers();
  if (withCookie) headers.set('cookie', 'anclora_session=token-abc');
  return new NextRequest('https://example.com/api/auth/logout', { method: 'POST', headers });
}

describe('POST /api/auth/logout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    deleteSessionMock.mockResolvedValue(undefined);
  });

  test('deletes the session and clears the cookie', async () => {
    const { POST } = await import('./route');
    const response = await POST(buildRequest());

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(deleteSessionMock).toHaveBeenCalledWith('token-abc');

    const cookie = response.cookies.get('anclora_session');
    expect(cookie?.value).toBe('');
    expect(cookie?.maxAge).toBe(0);
  });

  test('still clears the cookie when there is no session cookie', async () => {
    const { POST } = await import('./route');
    const response = await POST(buildRequest(false));

    expect(response.status).toBe(200);
    expect(deleteSessionMock).not.toHaveBeenCalled();
    expect(response.cookies.get('anclora_session')?.value).toBe('');
  });
});
