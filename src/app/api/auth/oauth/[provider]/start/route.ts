import { NextRequest, NextResponse } from 'next/server';
import { checkOAuthRateLimit, recordOAuthAttempt } from '@/lib/auth/rate-limit';
import { createOAuthTransaction } from '@/lib/auth/oauth/pkce';
import {
  createProviderAuthorizationUrl,
  parseOAuthProvider,
  readProviderOAuthConfig,
} from '@/lib/auth/oauth/providers';
import {
  encodeOAuthTransaction,
  OAUTH_TRANSACTION_COOKIE_OPTIONS,
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

  // Throws on partial/invalid configuration: misconfiguration must fail fast.
  const config = readProviderOAuthConfig(provider);
  if (!config) {
    return NextResponse.json({ error: 'PROVIDER_OAUTH_NOT_CONFIGURED' }, { status: 503 });
  }

  const rateLimitKey = `oauth-start:${clientIp(request)}`;
  const rateLimit = checkOAuthRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', retryAfterSeconds: rateLimit.retryAfterSeconds },
      { status: 429 },
    );
  }
  recordOAuthAttempt(rateLimitKey);

  const transaction = createOAuthTransaction();
  const authorizationUrl = createProviderAuthorizationUrl(provider, config, transaction);

  const response = NextResponse.redirect(authorizationUrl, 302);
  response.cookies.set(
    oauthTransactionCookieName(provider),
    encodeOAuthTransaction(transaction),
    OAUTH_TRANSACTION_COOKIE_OPTIONS,
  );
  return response;
}
