import { afterEach, describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { getSalesCredentialsKey, isGumroadFlagEnabled } from './config';

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('sales config', () => {
  test('the Gumroad flag is enabled only with GUMROAD_ENABLED=true', () => {
    vi.stubEnv('GUMROAD_ENABLED', '');
    expect(isGumroadFlagEnabled()).toBe(false);
    vi.stubEnv('GUMROAD_ENABLED', 'true');
    expect(isGumroadFlagEnabled()).toBe(true);
  });

  test('the credentials key prefers SALES_CREDENTIALS_KEY and falls back to the FileStudio one', () => {
    vi.stubEnv('SALES_CREDENTIALS_KEY', '');
    vi.stubEnv('FILESTUDIO_CREDENTIALS_KEY', '');
    expect(getSalesCredentialsKey()).toBeNull();

    vi.stubEnv('FILESTUDIO_CREDENTIALS_KEY', 'f'.repeat(64));
    expect(getSalesCredentialsKey()).toBe('f'.repeat(64));

    vi.stubEnv('SALES_CREDENTIALS_KEY', 'a'.repeat(64));
    expect(getSalesCredentialsKey()).toBe('a'.repeat(64));
  });
});
