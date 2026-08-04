/**
 * Asset manifest persistence (F2).
 *
 * A manifest version is immutable once written: regenerating the launch pack
 * appends version N+1 with the fresh item set. The latest version is the
 * project manifest the workspace shows.
 *
 * The db surface is injected so the module is unit-testable without a live
 * database (same pattern as filestudio/emission.ts).
 */

import 'server-only';
import { desc, eq } from 'drizzle-orm';
import { getDb } from '@/lib/db';
import { projectAssetManifests } from '@/lib/db/schema';
import type { ProjectAssetManifest, ProjectAssetManifestItem } from './model';

type ManifestStore = Pick<ReturnType<typeof getDb>, 'insert' | 'select'>;

export type { ManifestStore };

interface ManifestRow {
  id: string;
  projectId: string;
  version: number;
  items: unknown;
  createdAt: Date;
}

function rowToManifest(row: ManifestRow): ProjectAssetManifest {
  return {
    id: row.id,
    projectId: row.projectId,
    version: row.version,
    items: row.items as ProjectAssetManifestItem[],
    createdAt: row.createdAt.toISOString(),
  };
}

/** Latest manifest of a project (null when none was ever generated). */
export async function getLatestManifest(
  db: ManifestStore,
  projectId: string,
): Promise<ProjectAssetManifest | null> {
  const rows = (await db
    .select()
    .from(projectAssetManifests)
    .where(eq(projectAssetManifests.projectId, projectId))
    .orderBy(desc(projectAssetManifests.version))
    .limit(1)) as ManifestRow[];
  return rows[0] ? rowToManifest(rows[0]) : null;
}

/** All versions of a project manifest, newest first. */
export async function listManifestVersions(
  db: ManifestStore,
  projectId: string,
): Promise<ProjectAssetManifest[]> {
  const rows = (await db
    .select()
    .from(projectAssetManifests)
    .where(eq(projectAssetManifests.projectId, projectId))
    .orderBy(desc(projectAssetManifests.version))) as ManifestRow[];
  return rows.map(rowToManifest);
}

/**
 * Appends a new manifest version: version = latest + 1 (monotonic per
 * project), so concurrent reads can never mistake an old set for the current
 * one.
 */
export async function createManifestVersion(
  db: ManifestStore,
  input: { projectId: string; items: ProjectAssetManifestItem[] },
): Promise<ProjectAssetManifest> {
  const latest = await getLatestManifest(db, input.projectId);
  const version = (latest?.version ?? 0) + 1;

  const inserted = (await db
    .insert(projectAssetManifests)
    .values({ projectId: input.projectId, version, items: input.items })
    .returning()) as ManifestRow[];

  const row = inserted[0];
  if (!row) {
    throw new Error('Manifest insert returned no row');
  }
  return rowToManifest(row);
}

// ── Server wrappers (lazy DB) ───────────────────────────────────────────────

/** Latest manifest for the workspace UI (null when none or no database). */
export async function getLatestManifestForProject(
  projectId: string,
): Promise<ProjectAssetManifest | null> {
  return getLatestManifest(getDb(), projectId);
}
