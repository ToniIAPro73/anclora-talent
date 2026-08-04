import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import {
  finalizeCompletedJob,
  normalizeJobStatus,
  syncActiveJobsForProject,
  type BlobUploader,
} from './results';
import type { FileStudioJobRow } from './emission';

function jobRow(overrides: Partial<FileStudioJobRow> = {}): FileStudioJobRow {
  return {
    id: 'row-1',
    userId: 'user_1',
    projectId: '11111111-1111-1111-1111-111111111111',
    externalJobId: 'job_1600',
    operation: 'image:resize',
    mode: 'service',
    status: 'processing',
    errorCode: null,
    options: { width: 1600, fit: 'inside', quality: 85 },
    resultAssetUrl: null,
    createdAt: new Date('2026-08-04T00:00:00Z'),
    ...overrides,
  };
}

function createDbMock(opts: { selectRows?: unknown[] } = {}) {
  const updateSet = vi.fn(() => ({
    where: vi.fn().mockResolvedValue(undefined),
  }));
  return {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue(opts.selectRows ?? []),
          then: (resolve: (value: unknown) => void) => resolve(opts.selectRows ?? []),
        })),
      })),
    })),
    update: vi.fn(() => ({ set: updateSet })),
    updateSet,
  };
}

function downloadMock() {
  return vi.fn().mockResolvedValue({
    bytes: new Uint8Array([1, 2, 3]),
    sha256: 'sha',
    filename: 'cover-1600.jpg',
    mimeType: 'image/jpeg',
  });
}

const uploadOk: BlobUploader = vi.fn().mockResolvedValue({ url: 'https://blob.example/cover-1600.jpg' });

describe('normalizeJobStatus', () => {
  test.each([
    ['queued', 'queued'],
    ['processing', 'processing'],
    ['completed', 'completed'],
    ['failed', 'failed'],
    ['cancelled', 'cancelled'],
    ['expired', 'expired'],
    ['available', 'queued'],
    ['leased', 'processing'],
    ['rejected', 'failed'],
  ] as const)('maps %s → %s', (input, expected) => {
    expect(normalizeJobStatus(input)).toBe(expected);
  });
});

describe('finalizeCompletedJob (webhook/polling convergence)', () => {
  test('downloads with the single-use token, uploads to Blob and persists resultAssetUrl', async () => {
    const db = createDbMock();
    const downloadResult = downloadMock();
    const upload = vi.fn().mockResolvedValue({ url: 'https://blob.example/cover-1600.jpg' });

    const result = await finalizeCompletedJob(
      { db: db as never, client: { downloadResult }, upload },
      jobRow(),
    );

    expect(result).toEqual({ stored: true, url: 'https://blob.example/cover-1600.jpg' });
    expect(downloadResult).toHaveBeenCalledWith('job_1600');
    expect(upload).toHaveBeenCalledTimes(1);
    const [projectId, file] = upload.mock.calls[0] as [string, File];
    expect(projectId).toBe('11111111-1111-1111-1111-111111111111');
    expect(file.name).toBe('cover-1600.jpg');
    expect(file.type).toBe('image/jpeg');
    expect(db.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', resultAssetUrl: 'https://blob.example/cover-1600.jpg' }),
    );
  });

  test('is idempotent: a job with a result is never downloaded twice (token is single-use)', async () => {
    const db = createDbMock();
    const downloadResult = downloadMock();

    const result = await finalizeCompletedJob(
      { db: db as never, client: { downloadResult }, upload: uploadOk },
      jobRow({ resultAssetUrl: 'https://blob.example/already.jpg' }),
    );

    expect(result).toEqual({ stored: true, url: 'https://blob.example/already.jpg' });
    expect(downloadResult).not.toHaveBeenCalled();
    expect(db.update).not.toHaveBeenCalled();
  });

  test('completes without asset when Blob is unavailable (no token configured)', async () => {
    const db = createDbMock();
    const upload = vi.fn().mockResolvedValue(null);

    const result = await finalizeCompletedJob(
      { db: db as never, client: { downloadResult: downloadMock() }, upload },
      jobRow(),
    );

    expect(result).toEqual({ stored: false, url: null });
    expect(db.updateSet).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed', resultAssetUrl: null }),
    );
  });
});

describe('syncActiveJobsForProject (polling fallback)', () => {
  test('finalizes completed jobs and updates the status of the active ones', async () => {
    const completed = jobRow({ id: 'row-1', externalJobId: 'job_1600' });
    const processing = jobRow({ id: 'row-2', externalJobId: 'job_800' });
    const db = createDbMock({ selectRows: [completed, processing] });

    const downloadResult = downloadMock();
    const getJob = vi.fn().mockImplementation(async (externalJobId: string) => ({
      jobId: externalJobId,
      operation: 'image:resize',
      status: externalJobId === 'job_1600' ? 'completed' : 'processing',
    }));
    const upload = vi.fn().mockResolvedValue({ url: 'https://blob.example/cover-1600.jpg' });

    const synced = await syncActiveJobsForProject(
      {
        db: db as never,
        createClient: vi.fn().mockResolvedValue({ getJob, downloadResult }),
        upload,
      },
      { userId: 'user_1', projectId: completed.projectId as string },
    );

    expect(synced).toEqual([
      {
        id: 'row-1',
        externalJobId: 'job_1600',
        status: 'completed',
        resultAssetUrl: 'https://blob.example/cover-1600.jpg',
      },
      { id: 'row-2', externalJobId: 'job_800', status: 'processing', resultAssetUrl: null },
    ]);
    expect(downloadResult).toHaveBeenCalledTimes(1);
  });

  test('maps agent-internal statuses onto the Talent state machine', async () => {
    const leased = jobRow({ id: 'row-1', externalJobId: 'ajob_1600', mode: 'local' });
    const db = createDbMock({ selectRows: [leased] });
    const getJob = vi.fn().mockResolvedValue({ jobId: 'ajob_1600', operation: 'image:resize', status: 'leased' });

    const synced = await syncActiveJobsForProject(
      {
        db: db as never,
        createClient: vi.fn().mockResolvedValue({ getJob, downloadResult: downloadMock() }),
        upload: uploadOk,
      },
      { userId: 'user_1', projectId: leased.projectId as string },
    );

    expect(synced[0]?.status).toBe('processing');
    expect(db.updateSet).toHaveBeenCalledWith(expect.objectContaining({ status: 'processing' }));
  });
});
