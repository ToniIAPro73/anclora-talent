/**
 * Result reception — Talent side.
 *
 * When a job completes (webhook `job.completed` or the polling fallback), the
 * result is downloaded with the single-use token (client.downloadResult),
 * uploaded to Vercel Blob and the derived asset URL is persisted on the job
 * row (`resultAssetUrl`). The mutation is idempotent: a job that already has
 * a result URL is never downloaded twice (the token is single-use).
 */

import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { filestudioJobs } from '@/lib/db/schema';
import {
  projectAgentStatus,
  type FileStudioClient,
  type ProcessingMode,
  type TalentJobStatus,
} from './client';
import type { FileStudioJobRow } from './emission';

type ResultsStore = Pick<ReturnType<typeof getDb>, 'select' | 'update'>;

export type BlobUploader = (
  projectId: string,
  file: File,
) => Promise<{ url: string } | null>;

export interface FinalizeJobDeps {
  db: ResultsStore;
  client: Pick<FileStudioClient, 'downloadResult'>;
  upload: BlobUploader;
}

export interface FinalizeJobResult {
  stored: boolean;
  url: string | null;
}

const TERMINAL_AGENT_STATUSES = new Set(['completed', 'failed', 'rejected', 'cancelled']);

/**
 * Normalizes a FileStudio status read onto the Talent state machine: service
 * jobs already speak Talent states; agent-internal states are projected.
 */
export function normalizeJobStatus(status: string): TalentJobStatus {
  if (TERMINAL_AGENT_STATUSES.has(status) || status === 'available' || status === 'leased') {
    return projectAgentStatus(status as Parameters<typeof projectAgentStatus>[0]);
  }
  if (status === 'expired') return 'expired';
  if (status === 'queued' || status === 'processing') return status;
  return 'failed';
}

/**
 * Downloads the result of a completed job and stores it in Blob. Safe to call
 * from both the webhook deferral and the polling fallback: the single-use
 * token is consumed at most once per job.
 */
export async function finalizeCompletedJob(
  deps: FinalizeJobDeps,
  job: Pick<FileStudioJobRow, 'id' | 'projectId' | 'externalJobId' | 'resultAssetUrl'>,
): Promise<FinalizeJobResult> {
  if (job.resultAssetUrl) {
    return { stored: true, url: job.resultAssetUrl };
  }
  if (!job.projectId) {
    return { stored: false, url: null };
  }

  const result = await deps.client.downloadResult(job.externalJobId);
  const file = new File([result.bytes.buffer as ArrayBuffer], result.filename, {
    type: result.mimeType,
  });
  const uploaded = await deps.upload(job.projectId, file);
  const url = uploaded?.url ?? null;

  await deps.db
    .update(filestudioJobs)
    .set({ status: 'completed', resultAssetUrl: url, updatedAt: new Date() })
    .where(eq(filestudioJobs.id, job.id));

  return { stored: url !== null, url };
}

// ── Polling fallback (api-flow.md: used when no webhook arrived) ─────────────

export interface SyncJobsDeps {
  db: ResultsStore;
  /** Builds a client able to read the job in the mode it was emitted. */
  createClient: (
    mode: string,
  ) => Promise<Pick<FileStudioClient, 'getJob' | 'downloadResult'>>;
  upload: BlobUploader;
}

export interface SyncedJob {
  id: string;
  externalJobId: string;
  status: TalentJobStatus;
  resultAssetUrl: string | null;
}

/**
 * One-shot status reconciliation for the active jobs of a project. The UI
 * calls it when no webhook arrived after 2 minutes; each call reads the
 * current FileStudio status, applies the same state mutation as the webhook
 * and finalizes (download → Blob) the jobs that completed.
 */
export async function syncActiveJobsForProject(
  deps: SyncJobsDeps,
  input: { userId: string; projectId: string },
): Promise<SyncedJob[]> {
  const active = (await deps.db
    .select()
    .from(filestudioJobs)
    .where(
      and(
        eq(filestudioJobs.userId, input.userId),
        eq(filestudioJobs.projectId, input.projectId),
        inArray(filestudioJobs.status, ['queued', 'processing']),
      ),
    )) as FileStudioJobRow[];

  const synced: SyncedJob[] = [];

  for (const job of active) {
    const client = await deps.createClient(job.mode);
    const remote = await client.getJob(job.externalJobId);
    const status = normalizeJobStatus(remote.status);

    if (status === 'completed') {
      const finalized = await finalizeCompletedJob(
        { db: deps.db, client, upload: deps.upload },
        job,
      );
      synced.push({
        id: job.id,
        externalJobId: job.externalJobId,
        status,
        resultAssetUrl: finalized.url,
      });
      continue;
    }

    await deps.db
      .update(filestudioJobs)
      .set({ status, updatedAt: new Date() })
      .where(eq(filestudioJobs.id, job.id));
    synced.push({ id: job.id, externalJobId: job.externalJobId, status, resultAssetUrl: null });
  }

  return synced;
}

// ── Server wrapper (lazy DB + env config) ───────────────────────────────────

/**
 * Deferred finalization for the webhook route: loads the internal job row by
 * its FileStudio id, builds the client for the mode the job was emitted in
 * and runs download → Blob → resultAssetUrl. Failures are logged and leave
 * the job `completed` without asset; the polling fallback retries the
 * finalization later (idempotent by resultAssetUrl).
 */
export async function finalizeCompletedJobByExternalId(
  externalJobId: string,
): Promise<FinalizeJobResult | null> {
  const { getFileStudioConfig } = await import('./config');
  const { buildClientForMode } = await import('./clients');
  const { uploadProjectBlob } = await import('@/lib/blob/client');

  const config = getFileStudioConfig();
  if (!config) return null;

  const db = getDb();
  const rows = await db
    .select()
    .from(filestudioJobs)
    .where(eq(filestudioJobs.externalJobId, externalJobId))
    .limit(1);
  const job = rows[0] as FileStudioJobRow | undefined;
  if (!job) return null;

  try {
    const client = await buildClientForMode(config, job.userId, job.mode as ProcessingMode);
    return await finalizeCompletedJob({ db, client, upload: uploadProjectBlob }, job);
  } catch (error) {
    console.error('[filestudio/results] deferred finalization failed', { externalJobId, error });
    return null;
  }
}
