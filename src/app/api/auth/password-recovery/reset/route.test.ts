import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const { consumeTokenMock, hashPasswordMock, validPasswordMock } = vi.hoisted(() => ({
  consumeTokenMock: vi.fn(),
  hashPasswordMock: vi.fn(),
  validPasswordMock: vi.fn(),
}));

vi.mock('@/lib/auth/password-recovery', () => ({ consumePasswordResetToken: consumeTokenMock }));
vi.mock('@/lib/auth/password', () => ({
  hashPassword: hashPasswordMock,
  isValidPassword: validPasswordMock,
}));

function buildRequest(body: unknown) {
  return new NextRequest('https://talent.example.com/api/auth/password-recovery/reset', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/password-recovery/reset', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    validPasswordMock.mockReturnValue(true);
    hashPasswordMock.mockResolvedValue('new-bcrypt-hash');
  });

  test('changes password only when token claim succeeds', async () => {
    consumeTokenMock.mockResolvedValue(true);
    const { POST } = await import('./route');

    const response = await POST(buildRequest({ token: 'a'.repeat(43), password: 'valid-pass-1' }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(consumeTokenMock).toHaveBeenCalledWith('a'.repeat(43), 'new-bcrypt-hash');
  });

  test('rejects expired or reused token without changing password', async () => {
    consumeTokenMock.mockResolvedValue(false);
    const { POST } = await import('./route');

    const response = await POST(buildRequest({ token: 'a'.repeat(43), password: 'valid-pass-1' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'INVALID_OR_EXPIRED_TOKEN' });
  });

  test('rejects weak password before token lookup', async () => {
    validPasswordMock.mockReturnValue(false);
    const { POST } = await import('./route');

    const response = await POST(buildRequest({ token: 'a'.repeat(43), password: 'weak' }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: 'INVALID_RESET_REQUEST' });
    expect(consumeTokenMock).not.toHaveBeenCalled();
  });
});
