/**
 * Launch pack view-model for the workspace UI (F2).
 *
 * Resolves the latest manifest version of a project and flags every item
 * stale by comparing its `sourceHash` with the hash of the CURRENT document
 * AST — the document changed after the asset was generated.
 */

import 'server-only';
import { projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import { getDb, hasDatabase } from '@/lib/db';
import type { ProjectRecord } from '@/lib/projects/types';
import { hashDocumentAst } from './hash';
import { withStaleStatus, type ManifestItemWithStatus } from './model';
import { getLatestManifest } from './repository';

export interface LaunchPackView {
  version: number;
  createdAt: string;
  items: ManifestItemWithStatus[];
}

/** Latest manifest with stale flags; null when no pack was generated yet. */
export async function getLaunchPackViewForProject(
  project: ProjectRecord,
): Promise<LaunchPackView | null> {
  if (!hasDatabase()) return null;

  const manifest = await getLatestManifest(getDb(), project.id);
  if (!manifest) return null;

  const currentHash = hashDocumentAst(projectToSemanticDocument(project).document);
  return {
    version: manifest.version,
    createdAt: manifest.createdAt,
    items: withStaleStatus(manifest.items, currentHash),
  };
}
