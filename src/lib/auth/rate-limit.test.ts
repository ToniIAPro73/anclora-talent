import { describe, expect, test } from 'vitest';
import { checkLoginRateLimit, recordLoginAttempt, resetLoginAttempts } from './rate-limit';

describe('login rate limit', () => {
  test('allows the first attempts for a key', () => {
    const key = 'ip1:user1@example.com';
    expect(checkLoginRateLimit(key).allowed).toBe(true);

    for (let i = 0; i < 4; i += 1) recordLoginAttempt(key);
    expect(checkLoginRateLimit(key).allowed).toBe(true);
  });

  test('blocks after five failed attempts and reports a retry delay', () => {
    const key = 'ip2:user2@example.com';
    for (let i = 0; i < 5; i += 1) recordLoginAttempt(key);

    const result = checkLoginRateLimit(key);
    expect(result.allowed).toBe(false);
    expect(result.retryAfterSeconds).toBeGreaterThan(0);
  });

  test('tracks keys independently', () => {
    const blockedKey = 'ip3:user3@example.com';
    for (let i = 0; i < 5; i += 1) recordLoginAttempt(blockedKey);

    expect(checkLoginRateLimit(blockedKey).allowed).toBe(false);
    expect(checkLoginRateLimit('ip3:other@example.com').allowed).toBe(true);
  });

  test('reset clears the attempts for a key', () => {
    const key = 'ip4:user4@example.com';
    for (let i = 0; i < 5; i += 1) recordLoginAttempt(key);
    expect(checkLoginRateLimit(key).allowed).toBe(false);

    resetLoginAttempts(key);
    expect(checkLoginRateLimit(key).allowed).toBe(true);
  });
});
