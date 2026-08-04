/**
 * Document snapshots — canonical model and capture policy (F2).
 *
 * A snapshot is an immutable, append-only version of the full document AST
 * (SemanticDocument). Restoring never rewrites history: it saves the old AST
 * through the regular document save path and captures it as a NEW version
 * (G-trazabilidad).
 *
 * Capture policy (deliberately conservative — a snapshot per value moment,
 * never per keystroke):
 * - chapter save: auto-captured at most once per
 *   `AUTO_SAVE_SNAPSHOT_THROTTLE_MS` per project (editing-session
 *   granularity), and skipped when the AST is identical to the latest
 *   snapshot (nothing to diff);
 * - explicit "Guardar versión": always offered, same identical-AST skip;
 * - reimport and restore: always captured (structural events worth tracing).
 *
 * Retention: the latest `SNAPSHOT_RETENTION_LIMIT` versions per project are
 * kept; older ones are pruned on insert (`versionsToPrune`).
 */

import type { SemanticDocument } from '@/lib/document/model';

export type SnapshotSource = 'manual-save' | 'reimport' | 'restore';

export interface DocumentSnapshotMeta {
  id: string;
  projectId: string;
  /** Monotonic per project: the highest version is the newest snapshot. */
  version: number;
  label: string;
  source: SnapshotSource;
  /** SHA-256 of the AST — same hash the asset manifest uses as sourceHash. */
  sourceHash: string;
  createdBy: string;
  createdAt: string;
}

export interface DocumentSnapshot extends DocumentSnapshotMeta {
  document: SemanticDocument;
}

export const SNAPSHOT_RETENTION_LIMIT = 50;
export const AUTO_SAVE_SNAPSHOT_THROTTLE_MS = 15 * 60 * 1000;

/**
 * Throttle for the auto capture on chapter save: one snapshot per editing
 * session (first save after `AUTO_SAVE_SNAPSHOT_THROTTLE_MS` without one).
 */
export function shouldCaptureAutoSaveSnapshot(
  lastSnapshotCreatedAt: string | null,
  now: Date,
): boolean {
  if (!lastSnapshotCreatedAt) return true;
  const last = Date.parse(lastSnapshotCreatedAt);
  if (Number.isNaN(last)) return true;
  return now.getTime() - last >= AUTO_SAVE_SNAPSHOT_THROTTLE_MS;
}

/** Versions beyond the retention limit, from a newest-first version list. */
export function versionsToPrune(
  versionsDesc: number[],
  limit: number = SNAPSHOT_RETENTION_LIMIT,
): number[] {
  return versionsDesc.slice(limit);
}

/**
 * Auto label per origin (labels are persisted user-facing names, like
 * project titles — they keep the product default language).
 */
export function defaultSnapshotLabel(
  source: SnapshotSource,
  version: number,
  restoredFromVersion?: number,
): string {
  if (source === 'reimport') return `Reimportación ${version}`;
  if (source === 'restore') return `Restauración desde v${restoredFromVersion ?? '?'}`;
  return `Guardado ${version}`;
}
