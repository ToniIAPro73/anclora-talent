/**
 * Scanned-PDF OCR delegation for the import pipeline (F2).
 *
 * When the imported PDF is image-only (the text extractor returns ~nothing),
 * Talent delegates the OCR to FileStudio (`pdf:ocr`, Tesseract) and feeds the
 * recognized text back into the premium import pipeline. Routing is always
 * Mode 2 (service), declared: the Local Agent registry ships no OCR
 * operation (operations.ts doc).
 *
 * Contract limits (FileStudio `pdf:ocr` optionsSchema): `maxPages` ≤ 50 —
 * longer documents are OCR'd up to their first 50 pages, which the import UI
 * declares. The emitted job lands in `filestudio_jobs` (projectId null: the
 * project does not exist yet at import time) so the provenance trail matches
 * every other delegation.
 */

import 'server-only';
import { randomUUID } from 'node:crypto';
import { filestudioJobs } from '@/lib/db/schema';
import type { getDb } from '@/lib/db';
import type { ProcessingMode } from './client';
import {
  MAX_ACTIVE_JOBS_PER_USER,
  MAX_JOBS_PER_DAY_PER_USER,
  countActiveJobs,
  countJobsSince,
  startOfUtcDay,
  type EmissionClient,
} from './emission';
import {
  PDF_OCR_MAX_PAGES,
  PDF_OCR_OPERATION,
  pdfOcrOptions,
  type PdfOcrLang,
  type PdfOcrOptions,
} from './operations';

type JobsStore = Pick<ReturnType<typeof getDb>, 'insert' | 'select' | 'update'>;

/** Client surface the OCR flow needs (real FileStudioClient or mock). */
export type OcrClient = Pick<
  EmissionClient,
  'uploadFile' | 'createServiceJob'
> & {
  pollJobStatus: (jobId: string, options?: { timeoutMs?: number }) => Promise<{ status: string }>;
  downloadResult: (jobId: string) => Promise<{ bytes: Uint8Array }>;
};

export interface PdfOcrDeps {
  db: JobsStore;
  /** Service-mode client (token from FILESTUDIO_SERVICE_TOKEN). */
  createClient: () => Promise<OcrClient>;
  now?: () => Date;
  /** Poll timeout for the OCR job (kept short in tests). */
  pollTimeoutMs?: number;
}

export type PdfOcrResult =
  | { ok: true; mode: ProcessingMode; text: string; jobId: string; maxPagesApplied: number }
  | { ok: false; error: string };

/**
 * Runs OCR over a scanned PDF and returns the recognized text. Emission
 * failures, non-completed jobs and unreadable results all answer
 * `{ ok: false }` — the import pipeline then keeps its current behavior.
 */
export async function runPdfOcrForUser(
  deps: PdfOcrDeps,
  input: {
    userId: string;
    fileName: string;
    bytes: Uint8Array;
    pageCount?: number;
    lang?: PdfOcrLang;
  },
): Promise<PdfOcrResult> {
  const { db, now = () => new Date() } = deps;

  // Limits first (hardening.md §2): never create work past the user quota.
  if ((await countActiveJobs(db, input.userId)) >= MAX_ACTIVE_JOBS_PER_USER) {
    return { ok: false, error: 'limitConcurrent' };
  }
  if ((await countJobsSince(db, input.userId, startOfUtcDay(now()))) >= MAX_JOBS_PER_DAY_PER_USER) {
    return { ok: false, error: 'limitDaily' };
  }

  let client: OcrClient;
  try {
    client = await deps.createClient();
  } catch {
    return { ok: false, error: 'unavailable' };
  }

  // The FileStudio contract caps OCR at 50 pages (options.ts).
  const maxPagesApplied = Math.min(input.pageCount ?? PDF_OCR_MAX_PAGES, PDF_OCR_MAX_PAGES);
  const options = pdfOcrOptions(input.lang ?? 'spa', maxPagesApplied);

  try {
    const blob = new Blob([input.bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const upload = await client.uploadFile(blob, input.fileName);
    const job = await client.createServiceJob({
      operation: PDF_OCR_OPERATION,
      uploadId: upload.id,
      idempotencyKey: `pdf-ocr:${input.userId}:${randomUUID()}`,
      options,
    });

    const inserted = await db
      .insert(filestudioJobs)
      .values({
        userId: input.userId,
        // No project yet: the OCR runs before the project is created.
        projectId: null,
        externalJobId: job.jobId,
        operation: PDF_OCR_OPERATION,
        mode: 'service',
        status: 'queued',
        options: options satisfies PdfOcrOptions,
      })
      .returning({ id: filestudioJobs.id });
    const jobRowId = inserted[0]?.id ?? '';

    const terminal = await client.pollJobStatus(job.jobId, {
      timeoutMs: deps.pollTimeoutMs ?? 180_000,
    });
    if (terminal.status !== 'completed') {
      return { ok: false, error: 'unavailable' };
    }

    const result = await client.downloadResult(job.jobId);
    const text = new TextDecoder('utf-8').decode(result.bytes);
    if (!text.trim()) {
      return { ok: false, error: 'unavailable' };
    }

    return { ok: true, mode: 'service', text, jobId: jobRowId, maxPagesApplied };
  } catch {
    return { ok: false, error: 'unavailable' };
  }
}

// ── Server wrapper (import route wiring) ────────────────────────────────────

/**
 * Builds the OCR runner the import pipeline consumes, or undefined when the
 * integration cannot run (flag off, no database, no service token) — in
 * which case the import keeps its current behavior untouched.
 */
export async function buildImportOcrRunner(
  userId: string,
): Promise<
  ((input: {
    fileName: string;
    bytes: Buffer;
    pageCount?: number;
  }) => Promise<{ text: string; mode: 'local' | 'service' } | null>) | undefined
> {
  const { hasDatabase, getDb } = await import('@/lib/db');
  const { getFileStudioConfig, isFileStudioEnabled } = await import('./config');
  const { buildServiceClient } = await import('./clients');

  if (!isFileStudioEnabled() || !hasDatabase()) return undefined;
  const config = getFileStudioConfig();
  if (!config?.serviceToken) return undefined;

  return async ({ fileName, bytes, pageCount }) => {
    const result = await runPdfOcrForUser(
      {
        db: getDb(),
        createClient: () => buildServiceClient(config),
      },
      { userId, fileName, bytes: new Uint8Array(bytes), pageCount },
    );
    return result.ok ? { text: result.text, mode: result.mode as 'local' | 'service' } : null;
  };
}
