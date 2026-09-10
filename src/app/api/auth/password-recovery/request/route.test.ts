import { beforeEach, describe, expect, test, vi } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('server-only', () => ({}));

const {
  checkRateLimitMock,
  recordRateLimitMock,
  createTokenMock,
  invalidateTokenMock,
  configuredMock,
  sendEmailMock,
  findUserMock,
} = vi.hoisted(() => ({
  checkRateLimitMock: vi.fn(),
  recordRateLimitMock: vi.fn(),
  createTokenMock: vi.fn(),
  invalidateTokenMock: vi.fn(),
  configuredMock: vi.fn(),
  sendEmailMock: vi.fn(),
  findUserMock: vi.fn(),
}));

vi.mock('@/lib/auth/rate-limit', () => ({
  checkPasswordRecoveryRateLimit: checkRateLimitMock,
  recordPasswordRecoveryAttempt: recordRateLimitMock,
}));
vi.mock('@/lib/auth/password-recovery', () => ({
  createPasswordResetToken: createTokenMock,
  invalidatePasswordResetToken: invalidateTokenMock,
}));
vi.mock('@/lib/auth/password-recovery-email', () => ({
  isPasswordRecoveryEmailConfigured: configuredMock,
  sendPasswordResetEmail: sendEmailMock,
}));
vi.mock('@/lib/auth/users', () => ({ findUserByEmail: findUserMock }));

function buildRequest(body: unknown) {
  return new NextRequest('https://talent.example.com/api/auth/password-recovery/request', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '198.51.100.9' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/auth/password-recovery/request', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    checkRateLimitMock.mockReturnValue({ allowed: true, retryAfterSeconds: 0 });
    configuredMock.mockReturnValue(true);
    createTokenMock.mockResolvedValue({ token: 'a'.repeat(43), expiresAt: new Date('2030-01-01') });
    sendEmailMock.mockResolvedValue(undefined);
  });

  test('fails closed when transactional email is not configured', async () => {
    configuredMock.mockReturnValue(false);
    const { POST } = await import('./route');

    const response = await POST(buildRequest({ email: 'author@example.com' }));

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: 'RECOVERY_UNAVAILABLE' });
    expect(findUserMock).not.toHaveBeenCalled();
    expect(createTokenMock).not.toHaveBeenCalled();
  });

  test('returns the same accepted response for unknown and existing accounts', async () => {
    const { POST } = await import('./route');
    findUserMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
      id: 'user-1',
      email: 'author@example.com',
      fullName: 'Author One',
      passwordHash: 'bcrypt-hash',
    });

    const unknown = await POST(buildRequest({ email: 'unknown@example.com' }));
    const existing = await POST(buildRequest({ email: 'author@example.com' }));

    expect(unknown.status).toBe(202);
    expect(existing.status).toBe(202);
    await expect(unknown.json()).resolves.toEqual({ ok: true });
    await expect(existing.json()).resolves.toEqual({ ok: true });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][0].resetUrl).toMatch(
      /^https:\/\/talent\.example\.com\/reset-password\?token=/,
    );
  });

  test('returns rate-limit response without looking up the account', async () => {
    checkRateLimitMock.mockReturnValue({ allowed: false, retryAfterSeconds: 42 });
    const { POST } = await import('./route');

    const response = await POST(buildRequest({ email: 'author@example.com' }));

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({ error: 'RATE_LIMITED', retryAfterSeconds: 42 });
    expect(findUserMock).not.toHaveBeenCalled();
  });

  test('invalidates a token and preserves enumeration-safe response when delivery fails', async () => {
    findUserMock.mockResolvedValue({
      id: 'user-1',
      email: 'author@example.com',
      fullName: 'Author One',
      passwordHash: 'bcrypt-hash',
    });
    sendEmailMock.mockRejectedValue(Object.assign(new Error('provider unavailable'), {
      name: 'PasswordRecoveryEmailDeliveryError',
    }));
    const { POST } = await import('./route');

    const response = await POST(buildRequest({ email: 'author@example.com' }));

    expect(response.status).toBe(202);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(invalidateTokenMock).toHaveBeenCalledWith('a'.repeat(43));
  });
});
