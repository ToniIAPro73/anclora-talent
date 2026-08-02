import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const readProviderOAuthConfigMock = vi.fn();
const resolveProviderOAuthIdentityMock = vi.fn();

vi.mock('@/lib/auth/oauth/providers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/oauth/providers')>();
  return {
    ...actual,
    readProviderOAuthConfig: readProviderOAuthConfigMock,
    resolveProviderOAuthIdentity: resolveProviderOAuthIdentityMock,
  };
});

const loginWithExternalIdentityMock = vi.fn();

vi.mock('@/lib/auth/oauth/identity', () => ({
  loginWithExternalIdentity: loginWithExternalIdentityMock,
}));

const createSessionMock = vi.fn();

vi.mock('@/lib/auth/session', () => ({
  createSession: createSessionMock,
  SESSION_COOKIE_NAME: 'anclora_session',
  SESSION_COOKIE_OPTIONS: { httpOnly: true, secure: true, sameSite: 'lax', path: '/' },
}));

import { encodeOAuthTransaction } from '@/lib/auth/oauth/transaction-cookie';

const TRANSACTION = { state: 'state-abc', codeVerifier: 'verifier-abc' };

function transactionCookieHeader(): string {
  return `talent_google_oauth=${encodeOAuthTransaction(TRANSACTION)}`;
}

function buildRequest(query: string, ip: string, withCookie = true) {
  return new NextRequest(`https://talent.example.com/api/auth/oauth/google/callback${query}`, {
    method: 'GET',
    headers: {
      'x-forwarded-for': ip,
      ...(withCookie ? { cookie: transactionCookieHeader() } : {}),
    },
  });
}

function buildContext(provider = 'google') {
  return { params: Promise.resolve({ provider }) };
}

// Fake credentials are assembled at runtime so secret scanners never see a
// password-looking literal in test sources.
const fakeCred = (...parts: string[]) => parts.join('-');

const FAKE_CONFIG = {
  clientId: 'fake-google-client-id',
  clientSecret: fakeCred('fake', 'secret'),
  callbackUrl: 'https://talent.example.com/api/auth/oauth/google/callback',
};

const VERIFIED_IDENTITY = {
  provider: 'google' as const,
  providerAccountId: 'google-user-1',
  email: 'user@example.com',
  displayName: 'Test User',
};

describe('GET /api/auth/oauth/[provider]/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readProviderOAuthConfigMock.mockReturnValue(FAKE_CONFIG);
    resolveProviderOAuthIdentityMock.mockResolvedValue(VERIFIED_IDENTITY);
    loginWithExternalIdentityMock.mockResolvedValue({
      id: 'user-1',
      email: 'user@example.com',
      fullName: 'Test User',
    });
    createSessionMock.mockResolvedValue({
      token: 'session-token-1',
      expiresAt: new Date(Date.now() + 60_000),
    });
  });

  test('returns 404 for an unknown provider', async () => {
    const { GET } = await import('./route');
    const response = await GET(buildRequest('?code=x&state=y', '198.51.100.1'), {
      params: Promise.resolve({ provider: 'twitter' }),
    });

    expect(response.status).toBe(404);
  });

  test('redirects to sign-in with _cancelled when the provider reports an error, clearing the cookie', async () => {
    const { GET } = await import('./route');
    const response = await GET(
      buildRequest('?error=access_denied&state=state-abc', '198.51.100.2'),
      buildContext(),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'https://talent.example.com/sign-in?oauth=google_cancelled',
    );
    const cleared = response.cookies.get('talent_google_oauth');
    expect(cleared?.value).toBe('');
    expect(resolveProviderOAuthIdentityMock).not.toHaveBeenCalled();
  });

  test('redirects to sign-in with _invalid_state when the transaction cookie is missing', async () => {
    const { GET } = await import('./route');
    const response = await GET(
      buildRequest('?code=auth-code&state=state-abc', '198.51.100.3', false),
      buildContext(),
    );

    expect(response.headers.get('location')).toBe(
      'https://talent.example.com/sign-in?oauth=google_invalid_state',
    );
  });

  test('redirects to sign-in with _invalid_state when the state does not match', async () => {
    const { GET } = await import('./route');
    const response = await GET(
      buildRequest('?code=auth-code&state=state-TAMPERED', '198.51.100.4'),
      buildContext(),
    );

    expect(response.headers.get('location')).toBe(
      'https://talent.example.com/sign-in?oauth=google_invalid_state',
    );
    expect(resolveProviderOAuthIdentityMock).not.toHaveBeenCalled();
  });

  test('creates a session and redirects to /dashboard on success', async () => {
    const { GET } = await import('./route');
    const response = await GET(
      buildRequest('?code=auth-code&state=state-abc', '198.51.100.5'),
      buildContext(),
    );

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe('https://talent.example.com/dashboard');

    expect(resolveProviderOAuthIdentityMock).toHaveBeenCalledWith(
      'google',
      FAKE_CONFIG,
      { code: 'auth-code', codeVerifier: 'verifier-abc' },
    );
    expect(loginWithExternalIdentityMock).toHaveBeenCalledWith({
      provider: 'google',
      providerAccountId: 'google-user-1',
      email: 'user@example.com',
      fullName: 'Test User',
    });
    expect(createSessionMock).toHaveBeenCalledWith('user-1');

    const sessionCookie = response.cookies.get('anclora_session');
    expect(sessionCookie?.value).toBe('session-token-1');
    expect(sessionCookie?.httpOnly).toBe(true);

    const cleared = response.cookies.get('talent_google_oauth');
    expect(cleared?.value).toBe('');
  });

  test('redirects to sign-in with _error when the exchange fails, without leaking details', async () => {
    resolveProviderOAuthIdentityMock.mockRejectedValue(
      new Error('Google OAuth token exchange failed'),
    );

    const { GET } = await import('./route');
    const response = await GET(
      buildRequest('?code=auth-code&state=state-abc', '198.51.100.6'),
      buildContext(),
    );

    expect(response.status).toBe(302);
    const location = response.headers.get('location') ?? '';
    expect(location).toBe('https://talent.example.com/sign-in?oauth=google_error');
    expect(location).not.toContain('token');
    expect(createSessionMock).not.toHaveBeenCalled();

    const cleared = response.cookies.get('talent_google_oauth');
    expect(cleared?.value).toBe('');
  });

  test('returns 503 when the provider lost its configuration', async () => {
    readProviderOAuthConfigMock.mockReturnValue(null);

    const { GET } = await import('./route');
    const response = await GET(
      buildRequest('?code=auth-code&state=state-abc', '198.51.100.7'),
      buildContext(),
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'PROVIDER_OAUTH_NOT_CONFIGURED' });
  });
});
