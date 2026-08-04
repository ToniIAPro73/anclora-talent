'use server';

/**
 * Server actions — document version history (F2).
 *
 * Thin wrappers over snapshots/capture.ts: auth + database gate here,
 * capture policy unit-tested in capture.ts with injected deps. Restore
 * applies the old AST through the same document save route as
 * `saveProjectDocumentModelAction` (`saveDocumentExtras({ documentModel })`)
 * and captures it as a new version — history is never rewritten.
 */

import { revalidatePath } from 'next/cache';
import { requireUserId } from '@/lib/auth/guards';
import { projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import { getDb, hasDatabase } from '@/lib/db';
import { projectRepository } from '@/lib/db/repositories';
import { diffDocuments, type DocumentDiff } from '@/lib/document/diff';
import { captureDocumentSnapshot, restoreSnapshotAsNewVersion } from './capture';
import { getSnapshot } from './repository';

type SnapshotActionError = 'unavailable' | 'notFound' | 'unchanged';

/** Explicit "Guardar versión": captures the current AST as a manual-save version. */
export async function saveDocumentSnapshotAction(input: {
  projectId: string;
  label?: string;
}): Promise<{ ok: true; version: number } | { ok: false; error: SnapshotActionError }> {
  if (!hasDatabase()) return { ok: false, error: 'unavailable' };

  const userId = await requireUserId();
  const project = await projectRepository.getProjectById(userId, input.projectId);
  if (!project) return { ok: false, error: 'notFound' };

  const result = await captureDocumentSnapshot(getDb(), {
    projectId: project.id,
    document: projectToSemanticDocument(project).document,
    source: 'manual-save',
    createdBy: userId,
    ...(input.label?.trim() ? { label: input.label.trim() } : {}),
  });
  if (!result.created) return { ok: false, error: 'unchanged' };

  revalidatePath(`/projects/${input.projectId}/editor`);
  return { ok: true, version: result.snapshot.version };
}

/**
 * Structural diff between two snapshot versions (ids estables, agrupado por
 * capítulo). Versions are normalized older → newer.
 */
export async function diffSnapshotsAction(input: {
  projectId: string;
  fromVersion: number;
  toVersion: number;
}): Promise<{ ok: true; diff: DocumentDiff } | { ok: false; error: SnapshotActionError }> {
  if (!hasDatabase()) return { ok: false, error: 'unavailable' };

  const userId = await requireUserId();
  const project = await projectRepository.getProjectById(userId, input.projectId);
  if (!project) return { ok: false, error: 'notFound' };

  const older = Math.min(input.fromVersion, input.toVersion);
  const newer = Math.max(input.fromVersion, input.toVersion);
  const db = getDb();
  const [before, after] = await Promise.all([
    getSnapshot(db, project.id, older),
    getSnapshot(db, project.id, newer),
  ]);
  if (!before || !after) return { ok: false, error: 'notFound' };

  return { ok: true, diff: diffDocuments(before.document, after.document) };
}

/**
 * Restores an old version: saves its AST through the regular document save
 * route and captures the restored AST as a NEW version (source `restore`).
 */
export async function restoreSnapshotAction(input: {
  projectId: string;
  version: number;
}): Promise<{ ok: true; version: number } | { ok: false; error: SnapshotActionError }> {
  if (!hasDatabase()) return { ok: false, error: 'unavailable' };

  const userId = await requireUserId();
  const project = await projectRepository.getProjectById(userId, input.projectId);
  if (!project) return { ok: false, error: 'notFound' };

  const result = await restoreSnapshotAsNewVersion(
    getDb(),
    { projectId: project.id, version: input.version, createdBy: userId },
    async (document) => {
      await projectRepository.saveDocumentExtras(userId, project.id, { documentModel: document });
    },
  );
  if (!result.ok) return { ok: false, error: 'notFound' };

  revalidatePath(`/projects/${input.projectId}/editor`);
  revalidatePath(`/projects/${input.projectId}/preview`);
  return { ok: true, version: result.snapshot.version };
}
