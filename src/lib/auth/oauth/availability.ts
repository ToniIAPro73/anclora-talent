import 'server-only';
import { OAUTH_PROVIDERS, readProviderOAuthConfig } from './providers';
import type { OAuthProvider } from './providers';

export type OAuthAvailability = Record<OAuthProvider, boolean>;

/**
 * Resolves which social providers are fully configured, for server-side
 * rendering of the login card. A partially configured provider throws in
 * `readProviderOAuthConfig` (fail fast at the OAuth endpoints); for page
 * rendering we log the misconfiguration loudly and keep the button
 * disabled so credential sign-in stays available.
 */
export function resolveOAuthAvailability(): OAuthAvailability {
  const availability = {} as OAuthAvailability;

  for (const provider of OAUTH_PROVIDERS) {
    try {
      availability[provider] = readProviderOAuthConfig(provider) !== null;
    } catch (error) {
      availability[provider] = false;
      console.error(
        `[auth-oauth] invalid ${provider} OAuth configuration; provider disabled in UI`,
        error instanceof Error ? error.message : 'unknown error',
      );
    }
  }

  return availability;
}
