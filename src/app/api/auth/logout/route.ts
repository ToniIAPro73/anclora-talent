import { NextRequest, NextResponse } from 'next/server';
import { deleteSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from '@/lib/auth/session';

export async function POST(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (token) {
    await deleteSession(token);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, '', { ...SESSION_COOKIE_OPTIONS, maxAge: 0 });
  return response;
}
