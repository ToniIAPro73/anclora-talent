import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const cookiesMock = vi.fn();
const headersMock = vi.fn();
const redirectMock = vi.fn((url: string): never => {
  throw new Error(`NEXT_REDIRECT:${url}`);
});
const getSessionUserMock = vi.fn();

vi.mock('next/headers', () => ({
  cookies: cookiesMock,
  headers: headersMock,
}));

vi.mock('next/navigation', () => ({
  redirect: redirectMock,
}));

vi.mock('@/lib/auth/session', () => ({
  getSessionUser: getSessionUserMock,
  SESSION_COOKIE_NAME: 'anclora_session',
}));

function mockCookies(token?: string) {
  cookiesMock.mockResolvedValue({
    get: (name: string) => (name === 'anclora_session' && token ? { value: token } : undefined),
  });
}

function mockHeaders() {
  headersMock.mockResolvedValue({
    get: (name: string) => {
      if (name === 'host') return 'talent.example.com';
      return null;
    },
  });
}

const VALID_USER = { id: 'user-uuid-1', email: 'test@example.com', fullName: 'Test User' };

describe('getCurrentUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns null when there is no session cookie', async () => {
    mockCookies();
    const { getCurrentUser } = await import('./guards');

    await expect(getCurrentUser()).resolves.toBeNull();
    expect(getSessionUserMock).not.toHaveBeenCalled();
  });

  test('returns the session user when the token is valid', async () => {
    mockCookies('token-abc');
    getSessionUserMock.mockResolvedValue(VALID_USER);
    const { getCurrentUser } = await import('./guards');

    await expect(getCurrentUser()).resolves.toEqual(VALID_USER);
    expect(getSessionUserMock).toHaveBeenCalledWith('token-abc');
  });
});

describe('requireUserId', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('redirects to sign-in when there is no session cookie', async () => {
    mockCookies();
    mockHeaders();
    const { requireUserId } = await import('./guards');

    await expect(requireUserId()).rejects.toThrow('NEXT_REDIRECT:https://talent.example.com/sign-in');
  });

  test('redirects to sign-in when the session is expired or invalid', async () => {
    mockCookies('stale-token');
    mockHeaders();
    getSessionUserMock.mockResolvedValue(null);
    const { requireUserId } = await import('./guards');

    await expect(requireUserId()).rejects.toThrow('NEXT_REDIRECT:https://talent.example.com/sign-in');
  });

  test('returns the user id for a valid session', async () => {
    mockCookies('token-abc');
    mockHeaders();
    getSessionUserMock.mockResolvedValue(VALID_USER);
    const { requireUserId } = await import('./guards');

    await expect(requireUserId()).resolves.toBe('user-uuid-1');
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe('requireUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns the full user for a valid session', async () => {
    mockCookies('token-abc');
    mockHeaders();
    getSessionUserMock.mockResolvedValue(VALID_USER);
    const { requireUser } = await import('./guards');

    await expect(requireUser()).resolves.toEqual(VALID_USER);
  });

  test('redirects when unauthenticated', async () => {
    mockCookies();
    mockHeaders();
    const { requireUser } = await import('./guards');

    await expect(requireUser()).rejects.toThrow('NEXT_REDIRECT:https://talent.example.com/sign-in');
  });
});
