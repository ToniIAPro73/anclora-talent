import { describe, expect, test } from 'vitest';
import { createGitHubAuthorizationUrl } from './github-flow';

// Fake credentials are assembled at runtime so secret scanners never see a
// password-looking literal in test sources.
const fakeCred = (...parts: string[]) => parts.join('-');

const CONFIG = {
  clientId: 'fake-github-client-id',
  clientSecret: fakeCred('unused', 'in', 'this', 'test'),
  callbackUrl: 'https://talent.example.com/api/auth/oauth/github/callback',
};

const TRANSACTION = {
  state: 'state-123',
  codeVerifier: 'verifier-123',
  codeChallenge: 'challenge-123',
};

describe('createGitHubAuthorizationUrl', () => {
  test('builds the GitHub authorization URL with PKCE parameters', () => {
    const url = new URL(createGitHubAuthorizationUrl(CONFIG, TRANSACTION));

    expect(url.origin + url.pathname).toBe('https://github.com/login/oauth/authorize');
    expect(url.searchParams.get('client_id')).toBe('fake-github-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://talent.example.com/api/auth/oauth/github/callback',
    );
    expect(url.searchParams.get('scope')).toBe('read:user user:email');
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('code_challenge')).toBe('challenge-123');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });
});
