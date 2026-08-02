import type { GitHubOAuthConfig } from './github-config';
import type { OAuthTransaction } from './pkce';

const GITHUB_AUTHORIZATION_ENDPOINT = 'https://github.com/login/oauth/authorize';

const GITHUB_LOGIN_SCOPE = 'read:user user:email';

export function createGitHubAuthorizationUrl(
  config: GitHubOAuthConfig,
  transaction: OAuthTransaction,
): string {
  const url = new URL(GITHUB_AUTHORIZATION_ENDPOINT);

  url.searchParams.set('client_id', config.clientId);
  url.searchParams.set('redirect_uri', config.callbackUrl);
  url.searchParams.set('scope', GITHUB_LOGIN_SCOPE);
  url.searchParams.set('state', transaction.state);
  url.searchParams.set('code_challenge', transaction.codeChallenge);
  url.searchParams.set('code_challenge_method', 'S256');

  return url.toString();
}
