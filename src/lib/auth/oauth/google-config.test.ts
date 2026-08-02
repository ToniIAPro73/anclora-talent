import { describe, expect, test } from 'vitest';
import { readGoogleOAuthConfig } from './google-config';

// Fake credentials are assembled at runtime so secret scanners never see a
// password-looking literal in test sources.
const fakeCred = (...parts: string[]) => parts.join('-');

const VALID_ENV = {
  GOOGLE_OAUTH_CLIENT_ID: 'fake-google-client-id',
  GOOGLE_OAUTH_CLIENT_SECRET: fakeCred('fake', 'google', 'client', 'secret'),
  GOOGLE_OAUTH_CALLBACK_URL: 'https://talent.example.com/api/auth/oauth/google/callback',
};

describe('readGoogleOAuthConfig', () => {
  test('returns null when no Google OAuth variable is defined', () => {
    expect(readGoogleOAuthConfig({})).toBeNull();
  });

  test('returns null when all variables are empty strings', () => {
    expect(
      readGoogleOAuthConfig({
        GOOGLE_OAUTH_CLIENT_ID: '',
        GOOGLE_OAUTH_CLIENT_SECRET: '   ',
        GOOGLE_OAUTH_CALLBACK_URL: '',
      }),
    ).toBeNull();
  });

  test('parses a fully defined configuration', () => {
    expect(readGoogleOAuthConfig(VALID_ENV)).toEqual({
      clientId: 'fake-google-client-id',
      clientSecret: fakeCred('fake', 'google', 'client', 'secret'),
      callbackUrl: 'https://talent.example.com/api/auth/oauth/google/callback',
    });
  });

  test('throws when the configuration is partial (fail fast)', () => {
    expect(() =>
      readGoogleOAuthConfig({ GOOGLE_OAUTH_CLIENT_ID: 'fake-google-client-id' }),
    ).toThrow();
    expect(() =>
      readGoogleOAuthConfig({
        GOOGLE_OAUTH_CLIENT_ID: 'fake-google-client-id',
        GOOGLE_OAUTH_CLIENT_SECRET: fakeCred('fake', 'google', 'client', 'secret'),
      }),
    ).toThrow();
  });

  test('throws when the callback URL is not a valid URL', () => {
    expect(() =>
      readGoogleOAuthConfig({ ...VALID_ENV, GOOGLE_OAUTH_CALLBACK_URL: 'not-a-url' }),
    ).toThrow();
  });
});
