/**
 * Snapshot capture orchestration (F2).
 *
 * Applies the capture policy from model.ts over the repository:
 * - identical consecutive AST is skipped for `manual-save` (nothing to diff);
 *   `reimport` and `restore` always record (they are traceable events);
 * - the chapter-save auto capture is throttled per project
 *   (`shouldCaptureAutoSaveSnapshot`).
 *
 * `restoreSnapshotAsNewVersion` is the only restore path: it applies the old
 * AST through the injected document save route (the same one
 * `saveProjectDocumentModelAction` uses) and captures it as a NEW version —
 * history is never rewritten.
 *
 * Dependencies are injected so the module is unit-testable without a live
 * database or a full project record.
 */

import 'server-only';
import { projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import type { SemanticDocument } from '@/lib/document/model';
import { hashDocumentAst } from '@/lib/manifest/hash';
import type { ProjectRecord } from '@/lib/projects/types';
import {
  shouldCaptureAutoSaveSnapshot,
  type DocumentSnapshot,
  type SnapshotSource,
} from './model';
import {
  createSnapshot,
  getLatestSnapshot,
  getSnapshot,
  type SnapshotStore,
} from './repository';

export type CaptureResult =
  | { created: true; snapshot: DocumentSnapshot }
  | { created: false; reason: 'unchanged' | 'throttled' };

/** Captures the AST as a new version, honouring the dedupe policy. */
export async function captureDocumentSnapshot(
  db: SnapshotStore,
  input: {
    projectId: string;
    document: SemanticDocument;
    source: SnapshotSource;
    createdBy: string;
    label?: string;
    restoredFromVersion?: number;
  },
): Promise<CaptureResult> {
  const sourceHash = hashDocumentAst(input.document);
  const latest = await getLatestSnapshot(db, input.projectId);

  // Only manual saves dedupe: reimport/restore always leave a trace.
  if (input.source === 'manual-save' && latest?.sourceHash === sourceHash) {
    return { created: false, reason: 'unchanged' };
  }

  const snapshot = await createSnapshot(db, {
    projectId: input.projectId,
    document: input.document,
    source: input.source,
    sourceHash,
    createdBy: input.createdBy,
    ...(input.label ? { label: input.label } : {}),
    ...(input.restoredFromVersion !== undefined
      ? { restoredFromVersion: input.restoredFromVersion }
      : {}),
  });
  return { created: true, snapshot };
}

/** Captures the current AST of a project (reimport/restore events). */
export async function captureProjectSnapshot(
  db: SnapshotStore,
  input: {
    project: ProjectRecord;
    source: SnapshotSource;
    createdBy: string;
    restoredFromVersion?: number;
  },
): Promise<CaptureResult> {
  return captureDocumentSnapshot(db, {
    projectId: input.project.id,
    document: projectToSemanticDocument(input.project).document,
    source: input.source,
    createdBy: input.createdBy,
    ...(input.restoredFromVersion !== undefined
      ? { restoredFromVersion: input.restoredFromVersion }
      : {}),
  });
}

/**
 * Throttled auto capture on chapter save: at most one snapshot per project
 * per `AUTO_SAVE_SNAPSHOT_THROTTLE_MS` window (editing-session granularity,
 * never per keystroke).
 */
export async function captureAutoSaveSnapshot(
  db: SnapshotStore,
  input: { project: ProjectRecord; createdBy: string; now?: Date },
): Promise<CaptureResult> {
  const latest = await getLatestSnapshot(db, input.project.id);
  if (!shouldCaptureAutoSaveSnapshot(latest?.createdAt ?? null, input.now ?? new Date())) {
    return { created: false, reason: 'throttled' };
  }
  return captureProjectSnapshot(db, {
    project: input.project,
    source: 'manual-save',
    createdBy: input.createdBy,
  });
}

/**
 * Restores an old snapshot: applies its AST through the regular document
 * save route (injected — `saveDocumentExtras({ documentModel })` in the
 * server action) and captures the restored AST as a NEW version with source
 * `restore`. The target snapshot stays untouched (append-only history).
 */
export async function restoreSnapshotAsNewVersion(
  db: SnapshotStore,
  input: { projectId: string; version: number; createdBy: string },
  applyDocument: (document: SemanticDocument) => Promise<void>,
): Promise<{ ok: true; snapshot: DocumentSnapshot } | { ok: false; error: 'notFound' }> {
  const target = await getSnapshot(db, input.projectId, input.version);
  if (!target) {
    return { ok: false, error: 'notFound' };
  }

  await applyDocument(target.document);

  const result = await captureDocumentSnapshot(db, {
    projectId: input.projectId,
    document: target.document,
    source: 'restore',
    createdBy: input.createdBy,
    restoredFromVersion: target.version,
  });
  if (!result.created) {
    // Unreachable by policy (restore never dedupes); kept for type safety.
    return { ok: false, error: 'notFound' };
  }
  return { ok: true, snapshot: result.snapshot };
}
