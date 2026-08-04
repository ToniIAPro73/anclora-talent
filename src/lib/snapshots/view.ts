/**
 * Document history view-model for the workspace UI (F2).
 *
 * Resolves the snapshot metadata list (newest first, no AST payload) for the
 * history panel; diffs are computed on demand through `diffSnapshotsAction`.
 */

import 'server-only';
import { getDb, hasDatabase } from '@/lib/db';
import type { DocumentSnapshotMeta } from './model';
import { listSnapshots } from './repository';

/** Snapshot metadata of a project, newest first (empty without a database). */
export async function getSnapshotHistoryViewForProject(
  projectId: string,
): Promise<DocumentSnapshotMeta[]> {
  if (!hasDatabase()) return [];
  return listSnapshots(getDb(), projectId);
}
