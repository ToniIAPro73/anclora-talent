import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { FileStudioApiError } from './client';
import {
  confirmPairingForUser,
  getConnectionForUser,
  requestPairingForUser,
} from './pairing';

const KEY = 'c'.repeat(64);

function createDbMock(existingRow?: Record<string, unknown>) {
  const insertValues = vi.fn(() => ({
    onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
  }));
  const updateWhere = vi.fn().mockResolvedValue(undefined);
  return {
    insert: vi.fn(() => ({ values: insertValues })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: updateWhere })) })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue(existingRow ? [existingRow] : []),
        })),
      })),
    })),
    insertValues,
  };
}

describe('requestPairingForUser', () => {
  test('registers a pending connection for the user', async () => {
    const db = createDbMock();

    const connection = await requestPairingForUser(db as never, 'user_1', 'Portátil');

    expect(db.insert).toHaveBeenCalledTimes(1);
    expect(connection).toMatchObject({
      userId: 'user_1',
      status: 'pending',
      deviceName: 'Portátil',
      deviceId: null,
      preferredMode: 'local',
    });
  });
});

describe('confirmPairingForUser', () => {
  test('approves in FileStudio and stores credentials encrypted', async () => {
    const row = {
      userId: 'user_1',
      deviceId: 'dev_abc',
      deviceName: null,
      publicKey: null,
      encryptedCredentials: 'stored',
      status: 'paired',
      preferredMode: 'local',
    };
    const db = createDbMock(row);
    const approvePairing = vi.fn().mockResolvedValue({
      deviceId: 'dev_abc',
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      accessTokenExpiresAt: 600,
      refreshTokenExpiresAt: 2_592_000,
    });

    const connection = await confirmPairingForUser(
      db as never,
      { approvePairing },
      KEY,
      'user_1',
      { requestId: 'apr_1', code: '123456' },
    );

    expect(approvePairing).toHaveBeenCalledWith('apr_1', '123456');
    expect(connection.status).toBe('paired');
    expect(connection.deviceId).toBe('dev_abc');

    // The stored payload must be encrypted (round-trip verifiable), never plaintext.
    const stored = db.insertValues.mock.calls[0][0].encryptedCredentials as string;
    expect(stored).toMatch(/^v1:/);
    expect(stored).not.toContain('refresh-token');
    const { decryptCredentials } = await import('./crypto');
    const decrypted = JSON.parse(decryptCredentials(stored, KEY));
    expect(decrypted).toMatchObject({ accessToken: 'access-token', refreshToken: 'refresh-token' });
  });

  test('propagates FileStudio pairing rejections with their mapped code', async () => {
    const db = createDbMock();
    const approvePairing = vi
      .fn()
      .mockRejectedValue(new FileStudioApiError('PAIRING_CODE_INVALID', 'Conflict', 409));

    await expect(
      confirmPairingForUser(db as never, { approvePairing }, KEY, 'user_1', {
        requestId: 'apr_1',
        code: '000000',
      }),
    ).rejects.toMatchObject({ code: 'PAIRING_CODE_INVALID' });

    expect(db.insert).not.toHaveBeenCalled();
  });
});

describe('getConnectionForUser', () => {
  test('returns null when the user has no connection row', async () => {
    const db = createDbMock();
    await expect(getConnectionForUser(db as never, 'user_x')).resolves.toBeNull();
  });
});
