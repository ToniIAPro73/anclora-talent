/**
 * Document snapshot persistence (F2).
 *
 * Snapshots are append-only: capturing writes version N+1 (monotonic per
 * project) and prunes rows beyond the retention limit; no update path exists
 * (restores are new versions). The db surface is injected so the module is
 * unit-testable without a live database (same pattern as
 * manifest/repository.ts).
 */

import 'server-only';
import { desc, eq, inArray } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { documentSnapshots } from '@/lib/db/schema';
import type { SemanticDocument } from '@/lib/document/model';
import {
  defaultSnapshotLabel,
  versionsToPrune,
  type DocumentSnapshot,
  type DocumentSnapshotMeta,
  type SnapshotSource,
} from './model';

type SnapshotStore = Pick<ReturnType<typeof getDb>, 'insert' | 'select' | 'delete'>;

export type { SnapshotStore };

interface SnapshotRow {
  id: string;
  projectId: string;
  version: number;
  document: unknown;
  label: string;
  source: string;
  sourceHash: string;
  createdBy: string;
  createdAt: Date;
}

function rowToSnapshot(row: SnapshotRow): DocumentSnapshot {
  return {
    id: row.id,
    projectId: row.projectId,
    version: row.version,
    document: row.document as SemanticDocument,
    label: row.label,
    source: row.source as SnapshotSource,
    sourceHash: row.sourceHash,
    createdBy: row.createdBy,
    createdAt: row.createdAt.toISOString(),
  };
}

function toMeta(snapshot: DocumentSnapshot): DocumentSnapshotMeta {
  return {
    id: snapshot.id,
    projectId: snapshot.projectId,
    version: snapshot.version,
    label: snapshot.label,
    source: snapshot.source,
    sourceHash: snapshot.sourceHash,
    createdBy: snapshot.createdBy,
    createdAt: snapshot.createdAt,
  };
}

/** Newest snapshot of a project (null when none was ever captured). */
export async function getLatestSnapshot(
  db: SnapshotStore,
  projectId: string,
): Promise<DocumentSnapshot | null> {
  const rows = (await db
    .select()
    .from(documentSnapshots)
    .where(eq(documentSnapshots.projectId, projectId))
    .orderBy(desc(documentSnapshots.version))
    .limit(1)) as SnapshotRow[];
  return rows[0] ? rowToSnapshot(rows[0]) : null;
}

/** One snapshot by version (null when the project or version is unknown). */
export async function getSnapshot(
  db: SnapshotStore,
  projectId: string,
  version: number,
): Promise<DocumentSnapshot | null> {
  const rows = (await db
    .select()
    .from(documentSnapshots)
    .where(eq(documentSnapshots.projectId, projectId))
    .orderBy(desc(documentSnapshots.version))) as SnapshotRow[];
  const row = rows.find((candidate) => candidate.version === version);
  return row ? rowToSnapshot(row) : null;
}

/** Snapshot metadata of a project, newest first (no AST payload). */
export async function listSnapshots(
  db: SnapshotStore,
  projectId: string,
): Promise<DocumentSnapshotMeta[]> {
  const rows = (await db
    .select()
    .from(documentSnapshots)
    .where(eq(documentSnapshots.projectId, projectId))
    .orderBy(desc(documentSnapshots.version))) as SnapshotRow[];
  return rows.map((row) => toMeta(rowToSnapshot(row)));
}

/**
 * Appends a new snapshot: version = latest + 1 (monotonic per project), then
 * prunes versions beyond the retention limit. History is never rewritten —
 * prune only drops rows older than the kept window.
 */
export async function createSnapshot(
  db: SnapshotStore,
  input: {
    projectId: string;
    document: SemanticDocument;
    source: SnapshotSource;
    sourceHash: string;
    createdBy: string;
    label?: string;
    restoredFromVersion?: number;
  },
): Promise<DocumentSnapshot> {
  const latest = await getLatestSnapshot(db, input.projectId);
  const version = (latest?.version ?? 0) + 1;
  const label = input.label ?? defaultSnapshotLabel(input.source, version, input.restoredFromVersion);

  const inserted = (await db
    .insert(documentSnapshots)
    .values({
      projectId: input.projectId,
      version,
      document: input.document,
      label,
      source: input.source,
      sourceHash: input.sourceHash,
      createdBy: input.createdBy,
    })
    .returning()) as SnapshotRow[];

  const row = inserted[0];
  if (!row) {
    throw new Error('Snapshot insert returned no row');
  }

  // Retention: keep the newest SNAPSHOT_RETENTION_LIMIT versions per project.
  const rowsDesc = (await db
    .select()
    .from(documentSnapshots)
    .where(eq(documentSnapshots.projectId, input.projectId))
    .orderBy(desc(documentSnapshots.version))) as SnapshotRow[];
  const prunable = versionsToPrune(rowsDesc.map((candidate) => candidate.version));
  const staleIds = rowsDesc
    .filter((candidate) => prunable.includes(candidate.version))
    .map((candidate) => candidate.id);
  if (staleIds.length > 0) {
    await db.delete(documentSnapshots).where(inArray(documentSnapshots.id, staleIds));
  }

  return rowToSnapshot(row);
}
