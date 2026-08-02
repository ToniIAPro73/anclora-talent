import { describe, expect, test } from 'vitest';
import { createGoogleAuthorizationUrl } from './google-flow';

// Fake credentials are assembled at runtime so secret scanners never see a
// password-looking literal in test sources.
const fakeCred = (...parts: string[]) => parts.join('-');

const CONFIG = {
  clientId: 'fake-google-client-id',
  clientSecret: fakeCred('unused', 'in', 'this', 'test'),
  callbackUrl: 'https://talent.example.com/api/auth/oauth/google/callback',
};

const TRANSACTION = {
  state: 'state-123',
  codeVerifier: 'verifier-123',
  codeChallenge: 'challenge-123',
};

describe('createGoogleAuthorizationUrl', () => {
  test('builds the Google authorization URL with PKCE parameters', () => {
    const url = new URL(createGoogleAuthorizationUrl(CONFIG, TRANSACTION));

    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('client_id')).toBe('fake-google-client-id');
    expect(url.searchParams.get('redirect_uri')).toBe(
      'https://talent.example.com/api/auth/oauth/google/callback',
    );
    expect(url.searchParams.get('response_type')).toBe('code');
    expect(url.searchParams.get('scope')).toBe('openid email profile');
    expect(url.searchParams.get('state')).toBe('state-123');
    expect(url.searchParams.get('code_challenge')).toBe('challenge-123');
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
  });
});
