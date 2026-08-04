/**
 * Ebook legacy-format delegation (F2 — launch pack MOBI/AZW3).
 *
 * Emits EPUB → MOBI and EPUB → AZW3 conversions to FileStudio from the
 * compositor EPUB, one job per format sharing a single upload. Routing is
 * always Mode 2 (service), declared: Calibre is a desktop-only engine and
 * the Local Agent registry ships no ebook operation (operations.ts doc), so
 * there is no Mode 1 fallback and no Mode 1 consent step.
 *
 * Limits (hardening.md §2) are verified server-side before any job is
 * created — same contract as the cover optimization emission. Every emitted
 * job lands in `filestudio_jobs` with operation + options (provenance for
 * the asset manifest; the webhook/polling flow fills `resultAssetUrl`).
 */

import 'server-only';
import { randomUUID } from 'node:crypto';
import { filestudioJobs } from '@/lib/db/schema';
import {
  MAX_ACTIVE_JOBS_PER_USER,
  MAX_JOBS_PER_DAY_PER_USER,
  countActiveJobs,
  countJobsSince,
  startOfUtcDay,
  type EmissionClient,
} from './emission';
import {
  EBOOK_CONVERT_OPERATION,
  EBOOK_LEGACY_FORMATS,
  ebookConvertOptions,
  type EbookConvertOptions,
  type EbookLegacyFormat,
} from './operations';
import type { getDb } from '@/lib/db';

type JobsStore = Pick<ReturnType<typeof getDb>, 'insert' | 'select' | 'update'>;

export interface EbookInputPayload {
  bytes: Uint8Array;
  filename: string;
}

export interface EbookJobMetadata {
  title?: string;
  author?: string;
  language?: string;
}

export interface DelegateEbookDeps {
  db: JobsStore;
  /** Service-mode client (token from FILESTUDIO_SERVICE_TOKEN). */
  createClient: () => Promise<Pick<EmissionClient, 'uploadFile' | 'createServiceJob'>>;
  now?: () => Date;
}

export interface EmittedEbookJob {
  id: string;
  externalJobId: string;
  format: EbookLegacyFormat;
}

export type DelegateEbookResult =
  | { ok: true; mode: 'service'; jobs: EmittedEbookJob[] }
  | { ok: false; error: string; jobs?: EmittedEbookJob[] };

/**
 * Emits one `convert-ebook` Service job per legacy format (MOBI, AZW3) from
 * the given EPUB bytes. Partial emission is surfaced: jobs that reached
 * FileStudio stay tracked and are returned alongside the error.
 */
export async function delegateEbookFormatsForUser(
  deps: DelegateEbookDeps,
  input: {
    userId: string;
    projectId: string;
    epub: EbookInputPayload;
    metadata?: EbookJobMetadata;
  },
): Promise<DelegateEbookResult> {
  const { db, now = () => new Date() } = deps;

  // Limits first (hardening.md §2): never create work past the user quota.
  if ((await countActiveJobs(db, input.userId)) >= MAX_ACTIVE_JOBS_PER_USER) {
    return { ok: false, error: 'limitConcurrent' };
  }
  if ((await countJobsSince(db, input.userId, startOfUtcDay(now()))) >= MAX_JOBS_PER_DAY_PER_USER) {
    return { ok: false, error: 'limitDaily' };
  }

  let client: Pick<EmissionClient, 'uploadFile' | 'createServiceJob'>;
  try {
    client = await deps.createClient();
  } catch {
    return { ok: false, error: 'unavailable' };
  }

  const batchId = randomUUID();
  const emitted: EmittedEbookJob[] = [];

  try {
    const blob = new Blob([input.epub.bytes.buffer as ArrayBuffer], {
      type: 'application/epub+zip',
    });
    const upload = await client.uploadFile(blob, input.epub.filename);

    for (const format of EBOOK_LEGACY_FORMATS) {
      const options = ebookConvertOptions(format, input.metadata ?? {});
      const job = await client.createServiceJob({
        operation: EBOOK_CONVERT_OPERATION,
        uploadId: upload.id,
        idempotencyKey: `ebook-convert:${input.projectId}:${format}:${batchId}`,
        options,
      });
      const inserted = await db
        .insert(filestudioJobs)
        .values({
          userId: input.userId,
          projectId: input.projectId,
          externalJobId: job.jobId,
          operation: EBOOK_CONVERT_OPERATION,
          mode: 'service',
          status: 'queued',
          options: options satisfies EbookConvertOptions,
        })
        .returning({ id: filestudioJobs.id });
      emitted.push({ id: inserted[0]?.id ?? '', externalJobId: job.jobId, format });
    }
  } catch {
    return {
      ok: false,
      error: 'unavailable',
      jobs: emitted.length ? emitted : undefined,
    };
  }

  return { ok: true, mode: 'service', jobs: emitted };
}
