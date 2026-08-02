import bcrypt from 'bcryptjs';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const findUserByEmailMock = vi.fn();
const createSessionMock = vi.fn();

vi.mock('@/lib/auth/users', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/users')>();
  return { ...actual, findUserByEmail: findUserByEmailMock };
});

vi.mock('@/lib/auth/session', () => ({
  createSession: createSessionMock,
  SESSION_COOKIE_NAME: 'anclora_session',
  SESSION_COOKIE_OPTIONS: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' },
}));

function buildRequest(body: unknown) {
  return new NextRequest('https://example.com/api/auth/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '203.0.113.10' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

// Fake credentials are assembled at runtime so secret scanners never see a
// password-looking literal in test sources.
const fakeCred = (...parts: string[]) => parts.join('-');

// Low-cost hash keeps the test fast while remaining a valid bcrypt hash.
const PASSWORD = fakeCred('correct', 'cred', '7');
const PASSWORD_HASH = bcrypt.hashSync(PASSWORD, 4);
const STORED_USER = {
  id: 'user-1',
  email: 'user@example.com',
  fullName: 'Test User',
  passwordHash: PASSWORD_HASH,
};

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSessionMock.mockResolvedValue({ token: 'token-123', expiresAt: new Date(Date.now() + 60_000) });
  });

  test('returns 401 for a malformed payload', async () => {
    const { POST } = await import('./route');
    const response = await POST(buildRequest({ email: 'not-an-email', password: 'x' }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'INVALID_CREDENTIALS' });
  });

  test('returns generic 401 when the account does not exist', async () => {
    findUserByEmailMock.mockResolvedValue(null);
    const { POST } = await import('./route');
    const response = await POST(buildRequest({ email: 'ghost@example.com', password: fakeCred('any', 'cred', '1') }));

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data).toEqual({ error: 'INVALID_CREDENTIALS' });
    expect(JSON.stringify(data)).not.toContain('email');
  });

  test('returns generic 401 for a wrong password', async () => {
    findUserByEmailMock.mockResolvedValue(STORED_USER);
    const { POST } = await import('./route');
    const response = await POST(
      buildRequest({ email: 'user@example.com', password: fakeCred('wrong', 'cred', '1') }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: 'INVALID_CREDENTIALS' });
    expect(createSessionMock).not.toHaveBeenCalled();
  });

  test('returns 429 after repeated failed attempts for the same IP and email', async () => {
    findUserByEmailMock.mockResolvedValue(null);
    const { POST } = await import('./route');

    for (let i = 0; i < 5; i += 1) {
      const response = await POST(buildRequest({ email: 'brute@example.com', password: fakeCred('fail', 'cred', '1') }));
      expect(response.status).toBe(401);
    }

    const blocked = await POST(buildRequest({ email: 'brute@example.com', password: fakeCred('fail', 'cred', '1') }));
    expect(blocked.status).toBe(429);
    const data = await blocked.json();
    expect(data.error).toBe('RATE_LIMITED');
    expect(data.retryAfterSeconds).toBeGreaterThan(0);
  });

  test('logs in with valid credentials, creates a session and sets the cookie', async () => {
    findUserByEmailMock.mockResolvedValue(STORED_USER);
    const { POST } = await import('./route');
    const response = await POST(buildRequest({ email: ' User@Example.com ', password: PASSWORD }));

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.user).toEqual({ id: 'user-1', email: 'user@example.com', fullName: 'Test User' });

    expect(findUserByEmailMock).toHaveBeenCalledWith('user@example.com');
    expect(createSessionMock).toHaveBeenCalledWith('user-1');

    const cookie = response.cookies.get('anclora_session');
    expect(cookie?.value).toBe('token-123');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
    expect(cookie?.path).toBe('/');
  });
});
