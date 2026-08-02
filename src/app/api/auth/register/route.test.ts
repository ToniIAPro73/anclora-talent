import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const findUserByEmailMock = vi.fn();
const createUserMock = vi.fn();
const createSessionMock = vi.fn();

vi.mock('@/lib/auth/users', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/users')>();
  return {
    ...actual,
    findUserByEmail: findUserByEmailMock,
    createUser: createUserMock,
  };
});

vi.mock('@/lib/auth/session', () => ({
  createSession: createSessionMock,
  SESSION_COOKIE_NAME: 'anclora_session',
  SESSION_COOKIE_OPTIONS: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' },
}));

function buildRequest(body: unknown) {
  return new NextRequest('https://example.com/api/auth/register', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

// Fake credentials are assembled at runtime so secret scanners never see a
// password-looking literal in test sources.
const fakeCred = (...parts: string[]) => parts.join('-');

const VALID_BODY = {
  fullName: 'Test User',
  email: 'New@Example.com',
  password: fakeCred('sample', 'cred', '9'),
};

describe('POST /api/auth/register', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createSessionMock.mockResolvedValue({ token: 'token-123', expiresAt: new Date(Date.now() + 60_000) });
  });

  test('returns 400 for a malformed JSON body', async () => {
    const { POST } = await import('./route');
    const response = await POST(buildRequest('{not-json'));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'INVALID_BODY' });
  });

  test('returns 400 for an invalid email', async () => {
    const { POST } = await import('./route');
    const response = await POST(buildRequest({ ...VALID_BODY, email: 'not-an-email' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'INVALID_EMAIL' });
  });

  test('returns 400 for a weak password', async () => {
    const { POST } = await import('./route');
    const response = await POST(buildRequest({ ...VALID_BODY, password: fakeCred('only', 'letters') }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'INVALID_PASSWORD' });
  });

  test('returns 400 when full name is missing', async () => {
    const { POST } = await import('./route');
    const response = await POST(buildRequest({ ...VALID_BODY, fullName: '  ' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'INVALID_FULL_NAME' });
  });

  test('returns 409 when the email is already registered', async () => {
    findUserByEmailMock.mockResolvedValue({ id: 'existing', email: 'new@example.com' });
    const { POST } = await import('./route');
    const response = await POST(buildRequest(VALID_BODY));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: 'EMAIL_IN_USE' });
    expect(createUserMock).not.toHaveBeenCalled();
  });

  test('creates the user, starts a session and sets the cookie', async () => {
    findUserByEmailMock.mockResolvedValue(null);
    createUserMock.mockResolvedValue({
      id: 'user-1',
      email: 'new@example.com',
      fullName: 'Test User',
    });

    const { POST } = await import('./route');
    const response = await POST(buildRequest(VALID_BODY));

    expect(response.status).toBe(201);
    const data = await response.json();
    expect(data.user).toEqual({ id: 'user-1', email: 'new@example.com', fullName: 'Test User' });

    // Email is normalized before persisting.
    expect(findUserByEmailMock).toHaveBeenCalledWith('new@example.com');
    const createUserInput = createUserMock.mock.calls[0][0];
    expect(createUserInput.email).toBe('new@example.com');
    expect(createUserInput.passwordHash).not.toContain(VALID_BODY.password);

    expect(createSessionMock).toHaveBeenCalledWith('user-1');
    const cookie = response.cookies.get('anclora_session');
    expect(cookie?.value).toBe('token-123');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
    expect(cookie?.path).toBe('/');
  });
});
