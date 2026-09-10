import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));
const executeMock = vi.fn();
vi.mock('@/lib/db', () => ({ getDb: () => ({ execute: executeMock }) }));

import {
  consumePasswordResetToken,
  generatePasswordResetToken,
  hashPasswordResetToken,
  isPasswordResetTokenShapeValid,
} from './password-recovery';

describe('password recovery token contract', () => {
  beforeEach(() => {
    executeMock.mockReset();
  });

  test('generates 256-bit base64url token and one-way hash', () => {
    const token = generatePasswordResetToken();
    expect(isPasswordResetTokenShapeValid(token)).toBe(true);
    expect(hashPasswordResetToken(token)).toHaveLength(64);
    expect(hashPasswordResetToken(token)).not.toBe(token);
  });

  test('rejects malformed token shapes before database use', () => {
    expect(isPasswordResetTokenShapeValid('')).toBe(false);
    expect(isPasswordResetTokenShapeValid('short')).toBe(false);
    expect(isPasswordResetTokenShapeValid('a'.repeat(43) + '!')).toBe(false);
  });

  test('uses one atomic database statement for claim, password update and session invalidation', async () => {
    executeMock.mockResolvedValue({ rows: [{ user_id: 'user-1' }] });

    await expect(consumePasswordResetToken('a'.repeat(43), 'new-hash')).resolves.toBe(true);
    expect(executeMock).toHaveBeenCalledTimes(1);
  });

  test('returns false when atomic claim finds no live token', async () => {
    executeMock.mockResolvedValue({ rows: [] });

    await expect(consumePasswordResetToken('a'.repeat(43), 'new-hash')).resolves.toBe(false);
  });
});
