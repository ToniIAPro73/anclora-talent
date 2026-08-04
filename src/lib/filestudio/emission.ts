/**
 * Job emission — Talent side.
 *
 * Implements sdd/integrations/filestudio/routing-policy.md and hardening.md §2:
 *
 * - Routing: a paired Local Agent connection means Mode 1 (local); otherwise
 *   Mode 2 (service) as the declared fallback. Mode 1 requires ask-always
 *   consent: without a recorded `granted` decision for the operation the
 *   emission is refused with `requiresConsent` so the UI can ask.
 * - Limits (verified server-side, before creating any job): 3 active jobs per
 *   user, 50 jobs/day per user. Breaches answer with a product error key,
 *   never a FileStudio code.
 * - Every emitted job is persisted in `filestudio_jobs` with status, mode,
 *   operation and options (provenance for the F2 manifest).
 */

import 'server-only';
import { randomUUID } from 'node:crypto';
import { and, desc, eq, gte, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { filestudioJobs } from '@/lib/db/schema';
import {
  FileStudioApiError,
  FileStudioCircuitOpenError,
  type FileStudioClient,
  type ProcessingMode,
  type TalentJobStatus,
} from './client';
import { latestConsentForUser, recordConsentForUser } from './consent';
import {
  COVER_OPTIMIZE_OPERATION,
  COVER_OPTIMIZE_WIDTHS,
  coverOptimizeOptions,
  type CoverOptimizeOptions,
} from './operations';
import type { FileStudioConnection } from './pairing';
import type { ProjectRecord } from '@/lib/projects/types';

export const MAX_ACTIVE_JOBS_PER_USER = 3;
export const MAX_JOBS_PER_DAY_PER_USER = 50;

const ACTIVE_STATUSES: TalentJobStatus[] = ['queued', 'processing'];

/** Agent-Local retention/timeout for cover derivatives (api-flow.md). */
const AGENT_JOB_RETENTION_MINUTES = 60;
const AGENT_JOB_TIMEOUT_MS = 120_000;

type JobsStore = Pick<ReturnType<typeof getDb>, 'insert' | 'select' | 'update'>;

export interface FileStudioJobRow {
  id: string;
  userId: string;
  projectId: string | null;
  externalJobId: string;
  operation: string;
  mode: string;
  status: string;
  errorCode: string | null;
  options: unknown;
  resultAssetUrl: string | null;
  createdAt: Date;
}

export interface EmittedJob {
  id: string;
  externalJobId: string;
  width: number;
}

export type OptimizeCoverResult =
  | { ok: true; mode: ProcessingMode; jobs: EmittedJob[] }
  | {
      ok: false;
      requiresConsent: true;
      operation: string;
      mode: ProcessingMode;
      fileName: string;
    }
  | { ok: false; error: string; jobs?: EmittedJob[] };

export interface CoverImagePayload {
  bytes: Uint8Array;
  filename: string;
  mimeType: string;
}

/** Client surface the emission flow needs (real FileStudioClient or mock). */
export type EmissionClient = Pick<
  FileStudioClient,
  'uploadFile' | 'createServiceJob' | 'enqueueAgentJob'
>;

export interface OptimizeCoverDeps {
  db: JobsStore;
  loadProject: (userId: string, projectId: string) => Promise<ProjectRecord | null>;
  loadConnection: (userId: string) => Promise<FileStudioConnection | null>;
  /** Builds the FileStudio client for the resolved mode (service token or device credentials). */
  createClient: (mode: ProcessingMode) => Promise<EmissionClient>;
  fetchImpl?: typeof fetch;
  now?: () => Date;
}

const MIME_EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

/** Loads the cover image bytes from a Blob URL or a `data:` URL. */
export async function loadCoverImageFromUrl(
  imageUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CoverImagePayload> {
  if (imageUrl.startsWith('data:')) {
    const [header, data] = imageUrl.split(',', 2);
    const mimeType = header.match(/^data:([^;,]+)/)?.[1] ?? 'image/jpeg';
    const bytes = Uint8Array.from(Buffer.from(data ?? '', 'base64'));
    return { bytes, filename: `cover.${MIME_EXTENSION[mimeType] ?? 'jpg'}`, mimeType };
  }

  const response = await fetchImpl(imageUrl);
  if (!response.ok) {
    throw new Error(`Could not load cover image (HTTP ${response.status})`);
  }
  const mimeType = response.headers.get('Content-Type')?.split(';')[0] ?? 'image/jpeg';
  const bytes = new Uint8Array(await response.arrayBuffer());
  return { bytes, filename: `cover.${MIME_EXTENSION[mimeType] ?? 'jpg'}`, mimeType };
}

/** Picks the rasterized cover when present, else the uploaded cover asset. */
export function resolveCoverImageUrl(project: ProjectRecord): string | null {
  return project.cover.renderedImageUrl ?? project.cover.backgroundImageUrl ?? null;
}

async function countActiveJobs(db: JobsStore, userId: string): Promise<number> {
  const rows = await db
    .select({ id: filestudioJobs.id })
    .from(filestudioJobs)
    .where(and(eq(filestudioJobs.userId, userId), inArray(filestudioJobs.status, ACTIVE_STATUSES)));
  return rows.length;
}

async function countJobsSince(db: JobsStore, userId: string, since: Date): Promise<number> {
  const rows = await db
    .select({ id: filestudioJobs.id })
    .from(filestudioJobs)
    .where(and(eq(filestudioJobs.userId, userId), gte(filestudioJobs.createdAt, since)));
  return rows.length;
}

function startOfUtcDay(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function mapEmissionError(error: unknown): string {
  if (error instanceof FileStudioCircuitOpenError) return 'unavailable';
  if (error instanceof FileStudioApiError) return error.mapped.messageKey ?? 'unavailable';
  return 'unavailable';
}

/**
 * Routing policy decision for cover optimization. Mode 1 when a Local Agent
 * is paired; Mode 2 (declared fallback) otherwise.
 */
export function resolveProcessingMode(connection: FileStudioConnection | null): ProcessingMode {
  return connection?.status === 'paired' ? 'local' : 'service';
}

/**
 * Emits the 3-resolution cover optimization (`image:resize` per width).
 *
 * Consent (ask-always, Mode 1 only): `consent` is the user's explicit answer
 * to the UI prompt — it is recorded before any emission. Without it, a
 * previously recorded `granted` decision for this operation authorizes the
 * emission; anything else refuses with `requiresConsent`.
 */
export async function optimizeCoverForUser(
  deps: OptimizeCoverDeps,
  input: { userId: string; projectId: string; consent?: 'granted' | 'denied' },
): Promise<OptimizeCoverResult> {
  const { db, now = () => new Date() } = deps;
  const project = await deps.loadProject(input.userId, input.projectId);
  if (!project) return { ok: false, error: 'notFound' };

  const coverImageUrl = resolveCoverImageUrl(project);
  if (!coverImageUrl) return { ok: false, error: 'noCover' };

  // Limits first (hardening.md §2): never create work past the user quota.
  if ((await countActiveJobs(db, input.userId)) >= MAX_ACTIVE_JOBS_PER_USER) {
    return { ok: false, error: 'limitConcurrent' };
  }
  if ((await countJobsSince(db, input.userId, startOfUtcDay(now()))) >= MAX_JOBS_PER_DAY_PER_USER) {
    return { ok: false, error: 'limitDaily' };
  }

  const connection = await deps.loadConnection(input.userId);
  const mode = resolveProcessingMode(connection);

  if (mode === 'local') {
    if (input.consent) {
      // The UI asked and the user answered: the decision is registered
      // before any job reaches FileStudio (consent.ts contract).
      await recordConsentForUser(db, {
        userId: input.userId,
        operation: COVER_OPTIMIZE_OPERATION,
        mode,
        decision: input.consent,
        jobId: null,
      });
      if (input.consent === 'denied') {
        return { ok: false, error: 'consentRejected' };
      }
    } else {
      const latest = await latestConsentForUser(db, {
        userId: input.userId,
        operation: COVER_OPTIMIZE_OPERATION,
        mode,
      });
      if (latest !== 'granted') {
        return {
          ok: false,
          requiresConsent: true,
          operation: COVER_OPTIMIZE_OPERATION,
          mode,
          fileName: 'cover',
        };
      }
    }
  }

  let cover: CoverImagePayload;
  try {
    cover = await loadCoverImageFromUrl(coverImageUrl, deps.fetchImpl);
  } catch {
    return { ok: false, error: 'unavailable' };
  }

  let client: EmissionClient;
  try {
    client = await deps.createClient(mode);
  } catch {
    return { ok: false, error: 'unavailable' };
  }

  const batchId = randomUUID();
  const emitted: EmittedJob[] = [];

  try {
    if (mode === 'service') {
      // Upload once; the three resize jobs share the same uploadId.
      const blob = new Blob([cover.bytes.buffer as ArrayBuffer], { type: cover.mimeType });
      const upload = await client.uploadFile(blob, cover.filename);
      for (const width of COVER_OPTIMIZE_WIDTHS) {
        const job = await client.createServiceJob({
          operation: COVER_OPTIMIZE_OPERATION,
          uploadId: upload.id,
          idempotencyKey: `cover-optimize:${input.projectId}:${width}:${batchId}`,
          options: coverOptimizeOptions(width),
        });
        emitted.push(await persistJob(db, input, mode, width, job.jobId));
      }
    } else {
      for (const width of COVER_OPTIMIZE_WIDTHS) {
        const job = await client.enqueueAgentJob({
          operation: COVER_OPTIMIZE_OPERATION,
          input: cover.bytes,
          inputFilename: cover.filename,
          inputMimeType: cover.mimeType,
          options: coverOptimizeOptions(width),
          retentionMinutes: AGENT_JOB_RETENTION_MINUTES,
          timeoutMs: AGENT_JOB_TIMEOUT_MS,
          deviceId: connection?.deviceId ?? undefined,
        });
        emitted.push(await persistJob(db, input, mode, width, job.id));
      }
    }
  } catch (error) {
    // Partial emission: the jobs that reached FileStudio stay tracked.
    return { ok: false, error: mapEmissionError(error), jobs: emitted.length ? emitted : undefined };
  }

  return { ok: true, mode, jobs: emitted };
}

async function persistJob(
  db: JobsStore,
  input: { userId: string; projectId: string },
  mode: ProcessingMode,
  width: number,
  externalJobId: string,
): Promise<EmittedJob> {
  const inserted = await db
    .insert(filestudioJobs)
    .values({
      userId: input.userId,
      projectId: input.projectId,
      externalJobId,
      operation: COVER_OPTIMIZE_OPERATION,
      mode,
      status: 'queued',
      options: coverOptimizeOptions(width) satisfies CoverOptimizeOptions,
    })
    .returning({ id: filestudioJobs.id });

  return { id: inserted[0]?.id ?? '', externalJobId, width };
}

/** Jobs of a project, newest first (dashboard/cover listing). */
export async function listJobsForProject(
  db: JobsStore,
  input: { userId: string; projectId: string },
): Promise<FileStudioJobRow[]> {
  const rows = await db
    .select()
    .from(filestudioJobs)
    .where(and(eq(filestudioJobs.userId, input.userId), eq(filestudioJobs.projectId, input.projectId)))
    .orderBy(desc(filestudioJobs.createdAt));
  return rows as FileStudioJobRow[];
}

// ── Server wrappers (lazy DB) ───────────────────────────────────────────────

export interface ProjectFileStudioJob {
  id: string;
  operation: string;
  mode: ProcessingMode;
  status: string;
  width: number | null;
  resultAssetUrl: string | null;
  createdAt: string;
}

/** Server-side listing for the cover page (derivatives + mode per job). */
export async function listProjectFileStudioJobs(
  userId: string,
  projectId: string,
): Promise<ProjectFileStudioJob[]> {
  const rows = await listJobsForProject(getDb(), { userId, projectId });
  return rows.map((row) => ({
    id: row.id,
    operation: row.operation,
    mode: row.mode as ProcessingMode,
    status: row.status,
    width:
      typeof (row.options as { width?: unknown } | null)?.width === 'number'
        ? (row.options as { width: number }).width
        : null,
    resultAssetUrl: row.resultAssetUrl,
    createdAt: row.createdAt.toISOString(),
  }));
}
