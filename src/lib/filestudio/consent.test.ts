import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { latestConsentForUser, recordConsentForUser } from './consent';

function createDbMock(rows: Array<{ decision: string }> = []) {
  const insertValues = vi.fn().mockResolvedValue(undefined);
  return {
    insert: vi.fn(() => ({ values: insertValues })),
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          orderBy: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue(rows),
          })),
        })),
      })),
    })),
    insertValues,
  };
}

describe('ask-always consent registry', () => {
  test('records a granted decision per user/operation/mode', async () => {
    const db = createDbMock();

    await recordConsentForUser(db as never, {
      userId: 'user_1',
      operation: 'pdf.merge',
      mode: 'local',
      decision: 'granted',
      jobId: 'ajob_1',
    });

    expect(db.insertValues).toHaveBeenCalledWith({
      userId: 'user_1',
      operation: 'pdf.merge',
      mode: 'local',
      decision: 'granted',
      jobId: 'ajob_1',
    });
  });

  test('returns the latest decision and null when never asked', async () => {
    const denied = createDbMock([{ decision: 'denied' }]);
    await expect(
      latestConsentForUser(denied as never, {
        userId: 'user_1',
        operation: 'ocr.ingest',
        mode: 'local',
      }),
    ).resolves.toBe('denied');

    const neverAsked = createDbMock([]);
    await expect(
      latestConsentForUser(neverAsked as never, {
        userId: 'user_2',
        operation: 'ocr.ingest',
        mode: 'local',
      }),
    ).resolves.toBeNull();
  });
});
