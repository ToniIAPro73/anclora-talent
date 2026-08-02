import { NextRequest, NextResponse } from 'next/server';
import {
  hashPassword,
  isValidEmail,
  isValidPassword,
  normalizeEmail,
} from '@/lib/auth/password';
import { createSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/auth/session';
import { createUser, EmailAlreadyInUseError, findUserByEmail } from '@/lib/auth/users';

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const { email: rawEmail, password: rawPassword, fullName: rawFullName } = (body ?? {}) as Record<
    string,
    unknown
  >;

  const email = typeof rawEmail === 'string' ? normalizeEmail(rawEmail) : '';
  const password = typeof rawPassword === 'string' ? rawPassword : '';
  const fullName = typeof rawFullName === 'string' ? rawFullName.trim() : '';

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: 'INVALID_EMAIL' }, { status: 400 });
  }

  if (!isValidPassword(password)) {
    return NextResponse.json({ error: 'INVALID_PASSWORD' }, { status: 400 });
  }

  if (!fullName) {
    return NextResponse.json({ error: 'INVALID_FULL_NAME' }, { status: 400 });
  }

  try {
    if (await findUserByEmail(email)) {
      return NextResponse.json({ error: 'EMAIL_IN_USE' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ email, passwordHash, fullName });
    const { token, expiresAt } = await createSession(user.id);

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(SESSION_COOKIE_NAME, token, {
      ...SESSION_COOKIE_OPTIONS,
      expires: expiresAt,
    });
    return response;
  } catch (error) {
    if (error instanceof EmailAlreadyInUseError) {
      return NextResponse.json({ error: 'EMAIL_IN_USE' }, { status: 409 });
    }
    console.error('[auth-register] failed', error);
    return NextResponse.json({ error: 'REGISTER_FAILED' }, { status: 500 });
  }
}
