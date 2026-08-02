import { describe, expect, test, vi } from 'vitest';
import { resolveGitHubOAuthIdentity } from './github-client';
import type { OAuthFetch } from './google-client';

// Fake credentials are assembled at runtime so secret scanners never see a
// password-looking literal in test sources.
const fakeCred = (...parts: string[]) => parts.join('-');

const CONFIG = {
  clientId: 'fake-github-client-id',
  clientSecret: fakeCred('fake', 'github', 'client', 'secret'),
  callbackUrl: 'https://talent.example.com/api/auth/oauth/github/callback',
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
  token_type: 'bearer',
  scope: 'read:user,user:email',
};

const VALID_USER_PAYLOAD = {
  id: 123456,
  login: 'octocat',
  name: 'The Octocat',
  email: null,
  avatar_url: 'https://avatars.githubusercontent.com/u/123456',
};

const VALID_EMAILS_PAYLOAD = [
  { email: 'secondary@example.com', primary: false, verified: true, visibility: null },
  { email: 'Primary@Example.com', primary: true, verified: true, visibility: 'public' },
];

function createFetchMock(handlers: Record<string, Response>) {
  return vi.fn<OAuthFetch>(async (input: string | URL) => {
    const url = String(input);
    const response = handlers[url];
    if (!response) throw new Error(`Unexpected fetch to ${url}`);
    return response.clone();
  });
}

describe('resolveGitHubOAuthIdentity', () => {
  test('exchanges the code and returns the verified primary email identity', async () => {
    const fetchMock = createFetchMock({
      'https://github.com/login/oauth/access_token': jsonResponse(VALID_TOKEN_PAYLOAD),
      'https://api.github.com/user': jsonResponse(VALID_USER_PAYLOAD),
      'https://api.github.com/user/emails': jsonResponse(VALID_EMAILS_PAYLOAD),
    });

    const identity = await resolveGitHubOAuthIdentity(CONFIG, CODE_INPUT, fetchMock);

    expect(identity).toMatchObject({
      provider: 'github',
      providerAccountId: '123456',
      login: 'octocat',
      email: 'primary@example.com',
      displayName: 'The Octocat',
    });

    const [tokenUrl, tokenInit] = fetchMock.mock.calls[0];
    expect(String(tokenUrl)).toBe('https://github.com/login/oauth/access_token');
    expect(String(tokenInit?.body)).toContain('"code_verifier":"verifier-123"');
  });

  test('rejects when there is no verified primary email', async () => {
    const fetchMock = createFetchMock({
      'https://github.com/login/oauth/access_token': jsonResponse(VALID_TOKEN_PAYLOAD),
      'https://api.github.com/user': jsonResponse(VALID_USER_PAYLOAD),
      'https://api.github.com/user/emails': jsonResponse([
        { email: 'unverified@example.com', primary: true, verified: false, visibility: null },
        { email: 'verified-secondary@example.com', primary: false, verified: true, visibility: null },
      ]),
    });

    await expect(resolveGitHubOAuthIdentity(CONFIG, CODE_INPUT, fetchMock)).rejects.toThrow(
      'no verified primary email',
    );
  });

  test('throws a generic error when the token exchange fails, without sensitive details', async () => {
    const fetchMock = createFetchMock({
      'https://github.com/login/oauth/access_token': jsonResponse(
        { error: 'bad_verification_code', error_description: 'provider internal detail' },
        400,
      ),
    });

    await expect(resolveGitHubOAuthIdentity(CONFIG, CODE_INPUT, fetchMock)).rejects.toThrow(
      /^GitHub OAuth token exchange failed$/,
    );
  });

  test('throws when the user payload is malformed', async () => {
    const fetchMock = createFetchMock({
      'https://github.com/login/oauth/access_token': jsonResponse(VALID_TOKEN_PAYLOAD),
      'https://api.github.com/user': jsonResponse({ unexpected: true }),
      'https://api.github.com/user/emails': jsonResponse(VALID_EMAILS_PAYLOAD),
    });

    await expect(resolveGitHubOAuthIdentity(CONFIG, CODE_INPUT, fetchMock)).rejects.toThrow(
      'invalid user',
    );
  });
});
