import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { checkPasswordRecoveryRateLimit, recordPasswordRecoveryAttempt } from '@/lib/auth/rate-limit';
import {
  createPasswordResetToken,
  invalidatePasswordResetToken,
} from '@/lib/auth/password-recovery';
import {
  isPasswordRecoveryEmailConfigured,
  sendPasswordResetEmail,
} from '@/lib/auth/password-recovery-email';
import { isValidEmail, normalizeEmail } from '@/lib/auth/password';
import { findUserByEmail } from '@/lib/auth/users';

const ACCEPTED_RESPONSE = { ok: true } as const;

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

function recoveryUrl(request: NextRequest, token: string): string {
  const configuredOrigin = process.env.AUTH_APP_URL?.trim();
  const origin = configuredOrigin || request.nextUrl.origin;
  return new URL(`/reset-password?token=${encodeURIComponent(token)}`, `${origin}/`).toString();
}

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || randomUUID();
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const rawEmail = (body as { email?: unknown } | null)?.email;
  const email = typeof rawEmail === 'string' ? normalizeEmail(rawEmail) : '';
  const rateLimitKey = `${clientIp(request)}:${email || 'invalid'}`;
  const rateLimit = checkPasswordRecoveryRateLimit(rateLimitKey);

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', retryAfterSeconds: rateLimit.retryAfterSeconds },
      { status: 429 },
    );
  }
  recordPasswordRecoveryAttempt(rateLimitKey);

  // Refuse to promise delivery when the transactional boundary is absent.
  // This response is identical for every address, so it cannot enumerate.
  if (!isPasswordRecoveryEmailConfigured()) {
    console.warn('[auth-recovery] email boundary unavailable', { requestId });
    return NextResponse.json({ error: 'RECOVERY_UNAVAILABLE' }, { status: 503 });
  }

  if (!isValidEmail(email)) {
    return NextResponse.json(ACCEPTED_RESPONSE, { status: 202 });
  }

  let rawToken: string | null = null;
  try {
    const user = await findUserByEmail(email);
    if (!user || !user.passwordHash) {
      console.info('[auth-recovery] request completed', { requestId, outcome: 'accepted' });
      return NextResponse.json(ACCEPTED_RESPONSE, { status: 202 });
    }

    const created = await createPasswordResetToken(user.id);
    rawToken = created.token;
    await sendPasswordResetEmail({
      to: user.email,
      fullName: user.fullName,
      resetUrl: recoveryUrl(request, rawToken),
    });

    console.info('[auth-recovery] request completed', { requestId, outcome: 'accepted' });
    return NextResponse.json(ACCEPTED_RESPONSE, { status: 202 });
  } catch (error) {
    if (rawToken) {
      try {
        await invalidatePasswordResetToken(rawToken);
      } catch {
        console.error('[auth-recovery] token invalidation failed', { requestId });
      }
    }
    console.error('[auth-recovery] request failed', {
      requestId,
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    });

    // Keep provider failures account-safe: an external caller must not learn
    // whether a recipient exists from a delivery-specific status.
    if (error instanceof Error && error.name === 'PasswordRecoveryEmailDeliveryError') {
      return NextResponse.json(ACCEPTED_RESPONSE, { status: 202 });
    }

    return NextResponse.json({ error: 'RECOVERY_REQUEST_FAILED' }, { status: 500 });
  }
}
