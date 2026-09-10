import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { consumePasswordResetToken } from '@/lib/auth/password-recovery';
import { hashPassword, isValidPassword } from '@/lib/auth/password';

export async function POST(request: NextRequest) {
  const requestId = request.headers.get('x-request-id') || randomUUID();
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'INVALID_BODY' }, { status: 400 });
  }

  const { token: rawToken, password: rawPassword } = (body ?? {}) as Record<string, unknown>;
  const token = typeof rawToken === 'string' ? rawToken : '';
  const password = typeof rawPassword === 'string' ? rawPassword : '';

  if (!token || !isValidPassword(password)) {
    return NextResponse.json({ error: 'INVALID_RESET_REQUEST' }, { status: 400 });
  }

  try {
    const passwordHash = await hashPassword(password);
    const consumed = await consumePasswordResetToken(token, passwordHash);
    if (!consumed) {
      return NextResponse.json({ error: 'INVALID_OR_EXPIRED_TOKEN' }, { status: 400 });
    }

    console.info('[auth-recovery] password reset completed', { requestId });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[auth-recovery] password reset failed', {
      requestId,
      errorClass: error instanceof Error ? error.name : 'UnknownError',
    });
    return NextResponse.json({ error: 'RESET_FAILED' }, { status: 500 });
  }
}
