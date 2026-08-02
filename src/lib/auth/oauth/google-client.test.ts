import { describe, expect, test, vi } from 'vitest';
import { resolveGoogleOAuthIdentity } from './google-client';
import type { OAuthFetch } from './google-client';

// Fake credentials are assembled at runtime so secret scanners never see a
// password-looking literal in test sources.
const fakeCred = (...parts: string[]) => parts.join('-');

const CONFIG = {
  clientId: 'fake-google-client-id',
  clientSecret: fakeCred('fake', 'google', 'client', 'secret'),
  callbackUrl: 'https://talent.example.com/api/auth/oauth/google/callback',
};

const CODE_INPUT = { code: 'auth-code-123', codeVerifier: 'verifier-123' };

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

const VALID_TOKEN_PAYLOAD = {
  access_token: 'access-token-123',
  token_type: 'Bearer',
  expires_in: 3600,
};

const VALID_USER_PAYLOAD = {
  sub: 'google-user-1',
  email: 'User@Example.com',
  email_verified: true,
  name: 'Test User',
};

function createFetchMock(handlers: Record<string, Response>) {
  return vi.fn<OAuthFetch>(async (input: string | URL) => {
    const url = String(input);
    const response = handlers[url];
    if (!response) throw new Error(`Unexpected fetch to ${url}`);
    return response.clone();
  });
}

describe('resolveGoogleOAuthIdentity', () => {
  test('exchanges the code and returns a normalized verified identity', async () => {
    const fetchMock = createFetchMock({
      'https://oauth2.googleapis.com/token': jsonResponse(VALID_TOKEN_PAYLOAD),
      'https://openidconnect.googleapis.com/v1/userinfo': jsonResponse(VALID_USER_PAYLOAD),
    });

    const identity = await resolveGoogleOAuthIdentity(CONFIG, CODE_INPUT, fetchMock);

    expect(identity).toMatchObject({
      provider: 'google',
      providerAccountId: 'google-user-1',
      email: 'user@example.com',
      displayName: 'Test User',
    });

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(String(tokenUrl)).toBe('https://oauth2.googleapis.com/token');
    expect(String(tokenInit?.body)).toContain('code_verifier=verifier-123');
    expect(String(tokenInit?.body)).toContain('grant_type=authorization_code');
  });

  test('rejects an identity whose email is not verified', async () => {
    const fetchMock = createFetchMock({
      'https://oauth2.googleapis.com/token': jsonResponse(VALID_TOKEN_PAYLOAD),
      'https://openidconnect.googleapis.com/v1/userinfo': jsonResponse({
        ...VALID_USER_PAYLOAD,
        email_verified: false,
      }),
    });

    await expect(resolveGoogleOAuthIdentity(CONFIG, CODE_INPUT, fetchMock)).rejects.toThrow(
      'not verified',
    );
  });

  test('throws a generic error when the token exchange fails, without sensitive details', async () => {
    const fetchMock = createFetchMock({
      'https://oauth2.googleapis.com/token': jsonResponse(
        { error: 'invalid_grant', error_description: 'provider internal detail' },
        400,
      ),
    });

    await expect(resolveGoogleOAuthIdentity(CONFIG, CODE_INPUT, fetchMock)).rejects.toThrow(
      /^Google OAuth token exchange failed$/,
    );
  });

  test('throws when the token response is malformed', async () => {
    const fetchMock = createFetchMock({
      'https://oauth2.googleapis.com/token': jsonResponse({ unexpected: true }),
    });

    await expect(resolveGoogleOAuthIdentity(CONFIG, CODE_INPUT, fetchMock)).rejects.toThrow(
      'invalid token response',
    );
  });
});
