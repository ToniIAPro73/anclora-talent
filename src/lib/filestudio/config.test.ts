import { afterEach, describe, expect, test } from 'vitest';

vi.mock('server-only', () => ({}));

import { getFileStudioConfig, isFileStudioEnabled } from './config';

const ENV_KEYS = [
  'FILESTUDIO_API_URL',
  'FILESTUDIO_SERVICE_TOKEN',
  'FILESTUDIO_WEBHOOK_SECRET',
  'FILESTUDIO_CREDENTIALS_KEY',
];

afterEach(() => {
  for (const key of ENV_KEYS) delete process.env[key];
});

describe('FileStudio feature flag (no config → hidden and safe)', () => {
  test('is disabled when FILESTUDIO_API_URL is not set', () => {
    expect(isFileStudioEnabled()).toBe(false);
    expect(getFileStudioConfig()).toBeNull();
  });

  test('is enabled with FILESTUDIO_API_URL and reads optional secrets from env', () => {
    process.env.FILESTUDIO_API_URL = 'https://filestudio.test/';
    process.env.FILESTUDIO_WEBHOOK_SECRET = 'whsec';

    expect(isFileStudioEnabled()).toBe(true);
    const config = getFileStudioConfig();
    expect(config).toMatchObject({
      apiUrl: 'https://filestudio.test', // trailing slash stripped
      webhookSecret: 'whsec',
      serviceToken: null,
      credentialsKey: null,
    });
  });
});
