import { describe, expect, test, vi } from 'vitest';

vi.mock('server-only', () => ({}));

import { PDF_OCR_OPERATION, pdfOcrOptions } from './operations';
import { runPdfOcrForUser, type OcrClient, type PdfOcrDeps } from './ocr';

const USER = 'user_1';

function createDbMock(opts: { selectResults?: unknown[][] } = {}) {
  const selectQueue = [...(opts.selectResults ?? [])];
  const insertedValues: unknown[] = [];

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
        return { returning: vi.fn().mockResolvedValue([{ id: 'ocr-job-row' }]) };
      }),
    })),
    update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })) })),
  };

  return { db, insertedValues };
}

function createClientMock(): OcrClient & {
  uploadFile: ReturnType<typeof vi.fn>;
  createServiceJob: ReturnType<typeof vi.fn>;
  pollJobStatus: ReturnType<typeof vi.fn>;
  downloadResult: ReturnType<typeof vi.fn>;
} {
  return {
    uploadFile: vi.fn().mockResolvedValue({ id: 'upl-ocr' }),
    createServiceJob: vi.fn().mockResolvedValue({
      jobId: 'fs-ocr-1',
      status: 'queued',
      operation: PDF_OCR_OPERATION,
    }),
    pollJobStatus: vi.fn().mockResolvedValue({ status: 'completed' }),
    downloadResult: vi.fn().mockResolvedValue({
      bytes: new TextEncoder().encode('Texto reconocido por OCR'),
    }),
  };
}

function createDeps(overrides: Partial<PdfOcrDeps> = {}) {
  const { db, insertedValues } = createDbMock();
  const client = createClientMock();
  const deps: PdfOcrDeps = {
    db: db as never,
    createClient: vi.fn().mockResolvedValue(client),
    now: () => new Date('2026-08-04T10:00:00.000Z'),
    pollTimeoutMs: 1_000,
    ...overrides,
  };
  return { deps, client, insertedValues };
}

const PDF = { fileName: 'escaneado.pdf', bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46]) };

describe('pdfOcrOptions', () => {
  test('defaults to spa + the 50-page contract cap', () => {
    expect(pdfOcrOptions()).toEqual({ lang: 'spa', maxPages: 50 });
  });

  test('clamps maxPages to the FileStudio contract (1..50)', () => {
    expect(pdfOcrOptions('spa+eng', 120).maxPages).toBe(50);
    expect(pdfOcrOptions('eng', 0).maxPages).toBe(1);
  });
});

describe('runPdfOcrForUser', () => {
  test('emits pdf:ocr with the real contract payload and returns the recognized text', async () => {
    const { deps, client } = createDeps();
    const result = await runPdfOcrForUser(deps, { userId: USER, ...PDF, pageCount: 12 });

    expect(result).toMatchObject({ ok: true, mode: 'service', text: 'Texto reconocido por OCR' });
    expect(client.uploadFile).toHaveBeenCalledTimes(1);
    expect(client.uploadFile.mock.calls[0][1]).toBe('escaneado.pdf');

    const jobCall = client.createServiceJob.mock.calls[0][0];
    expect(jobCall.operation).toBe('pdf:ocr');
    expect(jobCall.uploadId).toBe('upl-ocr');
    expect(jobCall.options).toEqual({ lang: 'spa', maxPages: 12 });
    expect(jobCall.idempotencyKey).toMatch(`pdf-ocr:${USER}:`);

    expect(client.pollJobStatus).toHaveBeenCalledWith('fs-ocr-1', { timeoutMs: 1_000 });
    expect(client.downloadResult).toHaveBeenCalledWith('fs-ocr-1');
  });

  test('clamps long documents to the 50-page contract limit', async () => {
    const { deps, client } = createDeps();
    const result = await runPdfOcrForUser(deps, { userId: USER, ...PDF, pageCount: 240 });

    expect(result.ok).toBe(true);
    expect(client.createServiceJob.mock.calls[0][0].options.maxPages).toBe(50);
    if (result.ok) expect(result.maxPagesApplied).toBe(50);
  });

  test('persists the job with service mode and null projectId (pre-project import)', async () => {
    const { deps, insertedValues } = createDeps();
    const result = await runPdfOcrForUser(deps, { userId: USER, ...PDF });

    expect(result.ok).toBe(true);
    expect(insertedValues[0]).toMatchObject({
      userId: USER,
      projectId: null,
      externalJobId: 'fs-ocr-1',
      operation: 'pdf:ocr',
      mode: 'service',
      status: 'queued',
      options: { lang: 'spa', maxPages: 50 },
    });
    if (result.ok) expect(result.jobId).toBe('ocr-job-row');
  });

  test('refuses at the concurrent-job limit without touching FileStudio', async () => {
    const { db } = createDbMock({ selectResults: [[{ id: 'j1' }, { id: 'j2' }, { id: 'j3' }]] });
    const client = createClientMock();
    const result = await runPdfOcrForUser(
      { db: db as never, createClient: vi.fn().mockResolvedValue(client) },
      { userId: USER, ...PDF },
    );

    expect(result).toEqual({ ok: false, error: 'limitConcurrent' });
    expect(client.uploadFile).not.toHaveBeenCalled();
  });

  test('a non-completed terminal job answers ok:false (import keeps current behavior)', async () => {
    const client = createClientMock();
    client.pollJobStatus.mockResolvedValue({ status: 'failed' });
    const { deps } = createDeps({ createClient: vi.fn().mockResolvedValue(client) });

    const result = await runPdfOcrForUser(deps, { userId: USER, ...PDF });
    expect(result).toEqual({ ok: false, error: 'unavailable' });
  });

  test('an empty OCR result answers ok:false', async () => {
    const client = createClientMock();
    client.downloadResult.mockResolvedValue({ bytes: new TextEncoder().encode('   ') });
    const { deps } = createDeps({ createClient: vi.fn().mockResolvedValue(client) });

    const result = await runPdfOcrForUser(deps, { userId: USER, ...PDF });
    expect(result).toEqual({ ok: false, error: 'unavailable' });
  });

  test('returns unavailable when the service client cannot be built', async () => {
    const { deps } = createDeps({ createClient: vi.fn().mockRejectedValue(new Error('no token')) });
    const result = await runPdfOcrForUser(deps, { userId: USER, ...PDF });
    expect(result).toEqual({ ok: false, error: 'unavailable' });
  });
});
