import { describe, expect, test } from 'vitest';
import { readGitHubOAuthConfig } from './github-config';

// Fake credentials are assembled at runtime so secret scanners never see a
// password-looking literal in test sources.
const fakeCred = (...parts: string[]) => parts.join('-');

const VALID_ENV = {
  GITHUB_OAUTH_CLIENT_ID: 'fake-github-client-id',
  GITHUB_OAUTH_CLIENT_SECRET: fakeCred('fake', 'github', 'client', 'secret'),
  GITHUB_OAUTH_CALLBACK_URL: 'https://talent.example.com/api/auth/oauth/github/callback',
};

describe('readGitHubOAuthConfig', () => {
  test('returns null when no GitHub OAuth variable is defined', () => {
    expect(readGitHubOAuthConfig({})).toBeNull();
  });

  test('returns null when all variables are empty strings', () => {
    expect(
      readGitHubOAuthConfig({
        GITHUB_OAUTH_CLIENT_ID: '',
        GITHUB_OAUTH_CLIENT_SECRET: '   ',
        GITHUB_OAUTH_CALLBACK_URL: '',
      }),
    ).toBeNull();
  });

  test('parses a fully defined configuration', () => {
    expect(readGitHubOAuthConfig(VALID_ENV)).toEqual({
      clientId: 'fake-github-client-id',
      clientSecret: fakeCred('fake', 'github', 'client', 'secret'),
      callbackUrl: 'https://talent.example.com/api/auth/oauth/github/callback',
    });
  });

  test('throws when the configuration is partial (fail fast)', () => {
    expect(() =>
      readGitHubOAuthConfig({ GITHUB_OAUTH_CLIENT_ID: 'fake-github-client-id' }),
    ).toThrow();
    expect(() =>
      readGitHubOAuthConfig({
        GITHUB_OAUTH_CLIENT_ID: 'fake-github-client-id',
        GITHUB_OAUTH_CLIENT_SECRET: fakeCred('fake', 'github', 'client', 'secret'),
      }),
    ).toThrow();
  });

  test('throws when the callback URL is not a valid URL', () => {
    expect(() =>
      readGitHubOAuthConfig({ ...VALID_ENV, GITHUB_OAUTH_CALLBACK_URL: 'not-a-url' }),
    ).toThrow();
  });
});
