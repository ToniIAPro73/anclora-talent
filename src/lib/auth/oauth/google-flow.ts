import type { GoogleOAuthConfig } from './google-config';
import type { OAuthTransaction } from './pkce';

const GOOGLE_AUTHORIZATION_ENDPOINT = 'https://accounts.google.com/o/oauth2/v2/auth';

const GOOGLE_LOGIN_SCOPE = 'openid email profile';

export function createGoogleAuthorizationUrl(
  config: GoogleOAuthConfig,
  transaction: OAuthTransaction,
): string {
  const url = new URL(GOOGLE_AUTHORIZATION_ENDPOINT);

  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.callbackUrl);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', GOOGLE_LOGIN_SCOPE);
  url.searchParams.set('state', transaction.state);
  url.searchParams.set('code_challenge', transaction.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');
  url.searchParams.set('include_granted_scopes', 'true');
  url.searchParams.set('prompt', 'select_account');

  return url.toString();
}
