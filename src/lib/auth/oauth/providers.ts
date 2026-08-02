import type { GitHubOAuthConfig } from './github-config';
import { readGitHubOAuthConfig } from './github-config';
import { createGitHubAuthorizationUrl } from './github-flow';
import type { GitHubOAuthIdentity } from './github-client';
import { resolveGitHubOAuthIdentity } from './github-client';
import type { GoogleOAuthConfig } from './google-config';
import { readGoogleOAuthConfig } from './google-config';
import { createGoogleAuthorizationUrl } from './google-flow';
import type { GoogleOAuthIdentity } from './google-client';
import type { OAuthCodeInput, OAuthFetch } from './google-client';
import { resolveGoogleOAuthIdentity } from './google-client';
import type { OAuthTransaction } from './pkce';

export const OAUTH_PROVIDERS = ['google', 'github'] as const;

export type OAuthProvider = (typeof OAUTH_PROVIDERS)[number];

export type OAuthProviderConfig = GoogleOAuthConfig | GitHubOAuthConfig;

export type ExternalOAuthIdentity = GoogleOAuthIdentity | GitHubOAuthIdentity;

export function parseOAuthProvider(value: string): OAuthProvider | null {
  return (OAUTH_PROVIDERS as readonly string[]).includes(value) ? (value as OAuthProvider) : null;
}

/**
 * Reads the provider configuration from the environment. Returns `null`
 * when the provider is not configured; throws on partial/invalid config
 * (fail fast).
 */
export function readProviderOAuthConfig(provider: OAuthProvider): OAuthProviderConfig | null {
  return provider === 'google' ? readGoogleOAuthConfig() : readGitHubOAuthConfig();
}

export function createProviderAuthorizationUrl(
  provider: OAuthProvider,
  config: OAuthProviderConfig,
  transaction: OAuthTransaction,
): string {
  return provider === 'google'
    ? createGoogleAuthorizationUrl(config as GoogleOAuthConfig, transaction)
    : createGitHubAuthorizationUrl(config as GitHubOAuthConfig, transaction);
}

export function resolveProviderOAuthIdentity(
  provider: OAuthProvider,
  config: OAuthProviderConfig,
  input: OAuthCodeInput,
  fetchImplementation?: OAuthFetch,
): Promise<ExternalOAuthIdentity> {
  return provider === 'google'
    ? resolveGoogleOAuthIdentity(config as GoogleOAuthConfig, input, fetchImplementation)
    : resolveGitHubOAuthIdentity(config as GitHubOAuthConfig, input, fetchImplementation);
}
