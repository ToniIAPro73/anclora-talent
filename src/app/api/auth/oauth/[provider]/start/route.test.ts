import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const readProviderOAuthConfigMock = vi.fn();
const createProviderAuthorizationUrlMock = vi.fn();

vi.mock('@/lib/auth/oauth/providers', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/auth/oauth/providers')>();
  return {
    ...actual,
    readProviderOAuthConfig: readProviderOAuthConfigMock,
    createProviderAuthorizationUrl: createProviderAuthorizationUrlMock,
  };
});

function buildRequest(provider: string, ip = '198.51.100.23') {
  return new NextRequest(`https://talent.example.com/api/auth/oauth/${provider}/start`, {
    method: 'GET',
    headers: { 'x-forwarded-for': ip },
  });
}

function buildContext(provider: string) {
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

describe('GET /api/auth/oauth/[provider]/start', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('returns 404 for an unknown provider', async () => {
    const { GET } = await import('./route');
    const response = await GET(buildRequest('twitter'), buildContext('twitter'));

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: 'UNKNOWN_OAUTH_PROVIDER' });
  });

  test('returns 503 when the provider is not configured', async () => {
    readProviderOAuthConfigMock.mockReturnValue(null);
    const { GET } = await import('./route');
    const response = await GET(buildRequest('google'), buildContext('google'));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'PROVIDER_OAUTH_NOT_CONFIGURED' });
  });

  test('redirects (302) to the provider authorization URL and sets the transaction cookie', async () => {
    readProviderOAuthConfigMock.mockReturnValue(FAKE_CONFIG);
    createProviderAuthorizationUrlMock.mockReturnValue(
      'https://accounts.google.com/o/oauth2/v2/auth?client_id=fake-google-client-id&state=xyz',
    );

    const { GET } = await import('./route');
    const response = await GET(buildRequest('google'), buildContext('google'));

    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toBe(
      'https://accounts.google.com/o/oauth2/v2/auth?client_id=fake-google-client-id&state=xyz',
    );

    const cookie = response.cookies.get('talent_google_oauth');
    expect(cookie?.value).toBeTruthy();
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.sameSite).toBe('lax');
    expect(cookie?.maxAge).toBe(600);

    // The cookie payload carries the transaction and a future expiry.
    const payload = JSON.parse(Buffer.from(cookie!.value, 'base64url').toString('utf8'));
    expect(payload.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(payload.codeVerifier).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(payload.expiresAt).toBeGreaterThan(Date.now());
  });

  test('rate limits repeated starts from the same IP (10 per 15 minutes)', async () => {
    readProviderOAuthConfigMock.mockReturnValue(FAKE_CONFIG);
    createProviderAuthorizationUrlMock.mockReturnValue('https://accounts.google.com/o/oauth2/v2/auth');

    const { GET } = await import('./route');
    const ip = '203.0.113.99';

    for (let i = 0; i < 10; i += 1) {
      const response = await GET(buildRequest('google', ip), buildContext('google'));
      expect(response.status).toBe(302);
    }

    const blocked = await GET(buildRequest('google', ip), buildContext('google'));
    expect(blocked.status).toBe(429);
    const data = await blocked.json();
    expect(data.error).toBe('RATE_LIMITED');
    expect(data.retryAfterSeconds).toBeGreaterThan(0);
  });
});
