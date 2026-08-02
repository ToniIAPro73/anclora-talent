import { NextRequest, NextResponse } from 'next/server';
import { checkOAuthRateLimit, recordOAuthAttempt } from '@/lib/auth/rate-limit';
import { createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/auth/session';
import { hashEmailForAudit } from '@/lib/auth/oauth/audit';
import { loginWithExternalIdentity } from '@/lib/auth/oauth/identity';
import { oauthStatesMatch } from '@/lib/auth/oauth/pkce';
import {
  parseOAuthProvider,
  readProviderOAuthConfig,
  resolveProviderOAuthIdentity,
} from '@/lib/auth/oauth/providers';
import {
  decodeOAuthTransaction,
  oauthTransactionCookieName,
} from '@/lib/auth/oauth/transaction-cookie';

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

type RouteContext = { params: Promise<{ provider: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const provider = parseOAuthProvider((await context.params).provider);
  if (!provider) {
    return NextResponse.json({ error: 'UNKNOWN_OAUTH_PROVIDER' }, { status: 404 });
  }

  const cookieName = oauthTransactionCookieName(provider);

  // The transaction cookie is single-use: every exit path clears it.
  const fail = (reason: 'cancelled' | 'invalid_state' | 'error'): NextResponse => {
    const url = new URL('/sign-in', request.url);
    url.searchParams.set('oauth', `${provider}_${reason}`);
    const response = NextResponse.redirect(url, 302);
    response.cookies.delete(cookieName);
    return response;
  };

  const rateLimitKey = `oauth-callback:${clientIp(request)}`;
  const rateLimit = checkOAuthRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    const response = NextResponse.json(
      { error: 'RATE_LIMITED', retryAfterSeconds: rateLimit.retryAfterSeconds },
      { status: 429 },
    );
    response.cookies.delete(cookieName);
    return response;
  }
  recordOAuthAttempt(rateLimitKey);

  // The user aborted the consent screen at the provider.
  if (request.nextUrl.searchParams.get('error')) {
    return fail('cancelled');
  }

  const transaction = decodeOAuthTransaction(request.cookies.get(cookieName)?.value);
  if (!transaction) {
    return fail('invalid_state');
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state') ?? undefined;

  if (!code || !oauthStatesMatch(transaction.state, state)) {
    return fail('invalid_state');
  }

  // Throws on partial/invalid configuration: misconfiguration must fail fast.
  const config = readProviderOAuthConfig(provider);
  if (!config) {
    const response = NextResponse.json({ error: 'PROVIDER_OAUTH_NOT_CONFIGURED' }, { status: 503 });
    response.cookies.delete(cookieName);
    return response;
  }

  try {
    const identity = await resolveProviderOAuthIdentity(provider, config, {
      code,
      codeVerifier: transaction.codeVerifier,
    });

    const user = await loginWithExternalIdentity({
      provider,
      providerAccountId: identity.providerAccountId,
      email: identity.email,
      fullName: identity.displayName,
    });

    const { token, expiresAt } = await createSession(user.id);

    // Audit: never log the plain email, only its SHA-256 digest.
    console.info('[auth-oauth] social login succeeded', {
      provider,
      emailHash: hashEmailForAudit(identity.email),
    });

    const response = NextResponse.redirect(new URL('/dashboard', request.url), 302);
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      ...SESSION_COOKIE_OPTIONS,
      expires: expiresAt,
    });
    response.cookies.delete(cookieName);
    return response;
  } catch (error) {
    // Never expose exchange/provider details to the client.
    console.error(
      `[auth-oauth] ${provider} callback failed`,
      error instanceof Error ? error.message : 'unknown error',
    );
    return fail('error');
  }
}
