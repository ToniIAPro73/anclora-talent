import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { isValidEmail, normalizeEmail, verifyPassword } from '@/lib/auth/password';
import { checkLoginRateLimit, recordLoginAttempt, resetLoginAttempts } from '@/lib/auth/rate-limit';
import { createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/auth/session';
import { findUserByEmail } from '@/lib/auth/users';

// Constant-time defense: verify against a valid bcrypt hash even when the
// account does not exist, so timing does not leak which emails are registered.
const DUMMY_PASSWORD_HASH = bcrypt.hashSync('anclora-dummy-password', 10);

const INVALID_CREDENTIALS_RESPONSE = { error: 'INVALID_CREDENTIALS' } as const;

function clientIp(request: NextRequest): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const { email: rawEmail, password: rawPassword } = (body ?? {}) as Record<string, unknown>;
  const email = typeof rawEmail === 'string' ? normalizeEmail(rawEmail) : '';
  const password = typeof rawPassword === 'string' ? rawPassword : '';

  if (!isValidEmail(email) || !password) {
    return NextResponse.json(INVALID_CREDENTIALS_RESPONSE, { status: 401 });
  }

  const rateLimitKey = `${clientIp(request)}:${email}`;
  const rateLimit = checkLoginRateLimit(rateLimitKey);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'RATE_LIMITED', retryAfterSeconds: rateLimit.retryAfterSeconds },
      { status: 429 },
    );
  }

  try {
    const user = await findUserByEmail(email);
    const passwordMatches = await verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

    if (!user || !passwordMatches) {
      recordLoginAttempt(rateLimitKey);
      return NextResponse.json(INVALID_CREDENTIALS_RESPONSE, { status: 401 });
    }

    resetLoginAttempts(rateLimitKey);

    const { token, expiresAt } = await createSession(user.id);
    const response = NextResponse.json({
      user: { id: user.id, email: user.email, fullName: user.fullName },
    });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      ...SESSION_COOKIE_OPTIONS,
      expires: expiresAt,
    });
    return response;
  } catch (error) {
    console.error('[auth-login] failed', error);
    return NextResponse.json({ error: 'LOGIN_FAILED' }, { status: 500 });
  }
}
