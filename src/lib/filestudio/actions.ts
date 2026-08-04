'use server';

/**
 * Server actions — FileStudio cover optimization prototype (F1b).
 *
 * Thin wrappers over emission.ts / results.ts: auth + ownership + feature
 * flag here, product logic there (unit-tested with injected deps). Product
 * errors return i18n keys inside `filestudio.errors`; they never throw
 * FileStudio codes to the UI (error-mapping.md).
 */

import { requireUserId } from '@/lib/auth/guards';
import { hasDatabase } from '@/lib/db';
import { uploadProjectBlob } from '@/lib/blob/client';
import { projectRepository } from '@/lib/db/repositories';
import { getDb } from '@/lib/db';
import { buildClientForMode } from './clients';
import { getFileStudioConfig, isFileStudioEnabled } from './config';
import {
  optimizeCoverForUser,
  type OptimizeCoverResult,
} from './emission';
import { getConnection } from './pairing';
import { syncActiveJobsForProject, type SyncedJob } from './results';
import type { ProcessingMode } from './client';

export interface OptimizeCoverActionInput {
  projectId: string;
  /** User's explicit answer to the ask-always consent prompt (Mode 1). */
  consent?: 'granted' | 'denied';
}

export async function optimizeCoverAction(
  input: OptimizeCoverActionInput,
): Promise<OptimizeCoverResult> {
  const config = getFileStudioConfig();
  if (!isFileStudioEnabled() || !config || !hasDatabase()) {
    return { ok: false, error: 'unavailable' };
  }

  const userId = await requireUserId();

  return optimizeCoverForUser(
    {
      db: getDb(),
      loadProject: (uid, projectId) => projectRepository.getProjectById(uid, projectId),
      loadConnection: (uid) => getConnection(uid),
      createClient: (mode: ProcessingMode) => buildClientForMode(config, userId, mode),
    },
    { userId, projectId: input.projectId, consent: input.consent },
  );
}

export interface SyncFileStudioJobsResult {
  ok: boolean;
  error?: string;
  synced: SyncedJob[];
}

/**
 * Polling fallback (api-flow.md): the UI calls this when no webhook arrived
 * ~2 minutes after emission, and repeats it while jobs stay active. Each
 * call reconciles the status with FileStudio and finalizes completed jobs
 * (single-use download token → Vercel Blob → resultAssetUrl).
 */
export async function syncFileStudioJobsAction(input: {
  projectId: string;
}): Promise<SyncFileStudioJobsResult> {
  const config = getFileStudioConfig();
  if (!isFileStudioEnabled() || !config || !hasDatabase()) {
    return { ok: false, error: 'unavailable', synced: [] };
  }

  const userId = await requireUserId();
  const project = await projectRepository.getProjectById(userId, input.projectId);
  if (!project) {
    return { ok: false, error: 'notFound', synced: [] };
  }

  try {
    const synced = await syncActiveJobsForProject(
      {
        db: getDb(),
        createClient: (mode: string) =>
          buildClientForMode(config, userId, mode as ProcessingMode),
        upload: uploadProjectBlob,
      },
      { userId, projectId: input.projectId },
    );
    return { ok: true, synced };
  } catch (error) {
    console.error('[syncFileStudioJobsAction] failed', { projectId: input.projectId, error });
    return { ok: false, error: 'unavailable', synced: [] };
  }
}
