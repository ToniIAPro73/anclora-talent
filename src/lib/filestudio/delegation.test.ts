import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import type { EmissionClient } from './emission';
import { delegateEbookFormatsForUser, type DelegateEbookDeps } from './delegation';
import {
  EBOOK_CONVERT_OPERATION,
  EBOOK_LEGACY_FORMATS,
  ebookConvertOptions,
} from './operations';

const USER = 'user_1';
const PROJECT = '11111111-1111-1111-1111-111111111111';

/**
 * DB mock: select() drains `selectResults` (limits checks), insert() echoes a
 * row id per persisted job.
 */
function createDbMock(opts: { selectResults?: unknown[][] } = {}) {
  const selectQueue = [...(opts.selectResults ?? [])];
  const insertedValues: unknown[] = [];
  let jobCounter = 0;

  const db = {
    select: vi.fn(() => {
      const rows = selectQueue.shift() ?? [];
      return {
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue(rows),
              then: (resolve: (value: unknown) => void) => resolve(rows),
            })),
            then: (resolve: (value: unknown) => void) => resolve(rows),
          })),
        })),
      };
    }),
    insert: vi.fn(() => ({
      values: vi.fn((values: unknown) => {
        insertedValues.push(values);
        jobCounter += 1;
        return { returning: vi.fn().mockResolvedValue([{ id: `job-row-${jobCounter}` }]) };
      }),
    })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
  };

  return { db, insertedValues };
}

function createClientMock() {
  return {
    uploadFile: vi.fn().mockResolvedValue({ id: 'upl-1' }),
    createServiceJob: vi
      .fn()
      .mockResolvedValueOnce({ jobId: 'fs-job-mobi', status: 'queued', operation: EBOOK_CONVERT_OPERATION })
      .mockResolvedValueOnce({ jobId: 'fs-job-azw3', status: 'queued', operation: EBOOK_CONVERT_OPERATION }),
  };
}

function createDeps(overrides: Partial<DelegateEbookDeps> = {}) {
  const { db, insertedValues } = createDbMock();
  const client = createClientMock();
  const deps: DelegateEbookDeps = {
    db: db as never,
    createClient: vi.fn().mockResolvedValue(client),
    now: () => new Date('2026-08-04T10:00:00.000Z'),
    ...overrides,
  };
  return { deps, client, insertedValues };
}

const EPUB = { bytes: new Uint8Array([80, 75, 3, 4]), filename: 'mi-libro.epub' };
const METADATA = { title: 'Mi libro', author: 'Autora', language: 'es' };

describe('ebookConvertOptions', () => {
  test('carries the target format and the Calibre option keys', () => {
    expect(ebookConvertOptions('mobi', METADATA)).toEqual({
      outputFormat: 'mobi',
      title: 'Mi libro',
      author: 'Autora',
      language: 'es',
    });
  });

  test('omits empty metadata keys', () => {
    expect(ebookConvertOptions('azw3', {})).toEqual({ outputFormat: 'azw3' });
  });
});

describe('delegateEbookFormatsForUser', () => {
  test('uploads the EPUB once and emits one convert-ebook Service job per legacy format', async () => {
    const { deps, client } = createDeps();
    const result = await delegateEbookFormatsForUser(deps, {
      userId: USER,
      projectId: PROJECT,
      epub: EPUB,
      metadata: METADATA,
    });

    expect(result).toMatchObject({ ok: true, mode: 'service' });
    expect(client.uploadFile).toHaveBeenCalledTimes(1);
    expect(client.uploadFile.mock.calls[0][1]).toBe('mi-libro.epub');

    // Payload against the real contract: operation `convert-ebook` (Calibre
    // engine id), one job per format, Calibre option keys in options.
    expect(client.createServiceJob).toHaveBeenCalledTimes(EBOOK_LEGACY_FORMATS.length);
    const [mobiCall, azw3Call] = client.createServiceJob.mock.calls.map((call) => call[0]);
    expect(mobiCall.operation).toBe('convert-ebook');
    expect(mobiCall.uploadId).toBe('upl-1');
    expect(mobiCall.options).toEqual({
      outputFormat: 'mobi',
      title: 'Mi libro',
      author: 'Autora',
      language: 'es',
    });
    expect(mobiCall.idempotencyKey).toMatch(`ebook-convert:${PROJECT}:mobi:`);
    expect(azw3Call.options.outputFormat).toBe('azw3');
    expect(azw3Call.idempotencyKey).toMatch(`ebook-convert:${PROJECT}:azw3:`);
  });

  test('persists every emitted job with operation + options (manifest provenance)', async () => {
    const { deps, insertedValues } = createDeps();
    const result = await delegateEbookFormatsForUser(deps, {
      userId: USER,
      projectId: PROJECT,
      epub: EPUB,
      metadata: METADATA,
    });

    expect(result.ok).toBe(true);
    expect(insertedValues).toHaveLength(2);
    expect(insertedValues[0]).toMatchObject({
      userId: USER,
      projectId: PROJECT,
      externalJobId: 'fs-job-mobi',
      operation: 'convert-ebook',
      mode: 'service',
      status: 'queued',
      options: { outputFormat: 'mobi', title: 'Mi libro', author: 'Autora', language: 'es' },
    });
    if (result.ok) {
      expect(result.jobs.map((job) => job.format)).toEqual(['mobi', 'azw3']);
      expect(result.jobs[0].id).toBe('job-row-1');
    }
  });

  test('refuses when the user is at the concurrent-job limit and never calls FileStudio', async () => {
    const { db } = createDbMock({ selectResults: [[{ id: 'j1' }, { id: 'j2' }, { id: 'j3' }]] });
    const client = createClientMock();
    const result = await delegateEbookFormatsForUser(
      { db: db as never, createClient: vi.fn().mockResolvedValue(client) },
      { userId: USER, projectId: PROJECT, epub: EPUB },
    );

    expect(result).toEqual({ ok: false, error: 'limitConcurrent' });
    expect(client.uploadFile).not.toHaveBeenCalled();
  });

  test('returns unavailable when the client cannot be built (no service token)', async () => {
    const { deps } = createDeps({ createClient: vi.fn().mockRejectedValue(new Error('no token')) });
    const result = await delegateEbookFormatsForUser(deps, {
      userId: USER,
      projectId: PROJECT,
      epub: EPUB,
    });
    expect(result).toEqual({ ok: false, error: 'unavailable' });
  });

  test('partial emission: a failing second job keeps the first one tracked', async () => {
    const { deps, client, insertedValues } = createDeps();
    client.createServiceJob.mockReset();
    client.createServiceJob
      .mockResolvedValueOnce({ jobId: 'fs-job-mobi', status: 'queued', operation: EBOOK_CONVERT_OPERATION })
      .mockRejectedValueOnce(new Error('boom'));

    const result = await delegateEbookFormatsForUser(deps, {
      userId: USER,
      projectId: PROJECT,
      epub: EPUB,
    });

    expect(result.ok).toBe(false);
    expect(result.jobs?.map((job) => job.format)).toEqual(['mobi']);
    expect(insertedValues).toHaveLength(1);
  });
});

describe('delegate deps type', () => {
  test('client surface matches the FileStudioClient emission subset', () => {
    const _check: Pick<EmissionClient, 'uploadFile' | 'createServiceJob'> | null = null;
    expect(_check).toBeNull();
  });
});
