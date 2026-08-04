/**
 * Coordinated multi-format export — the "launch pack" (F2).
 *
 * One operation generates every deliverable the project's product template
 * declares (`derivedAssets`) plus the Markdown blog derivative, uploads each
 * to Blob and records them in a new asset-manifest version with provenance
 * `compositor` and the current AST hash as `sourceHash`.
 *
 * Plan mapping (declarative template → pack assets):
 * - `epub` / `pdf` / `html` / `slides` in derivedAssets → that compositor asset.
 * - `markdown` is always part of the pack (blog derivative of the same AST).
 * - Projects without a template (imported) get the default set
 *   epub + pdf + html + markdown.
 * - `docx` stays an on-demand export route; `landing-copy`, `bundle-manifest`
 *   and `audio-video` have no generator yet (documented gap, out of the pack).
 *
 * Deps are injected so the coordination is unit-tested without react-pdf,
 * Blob or a database (same pattern as filestudio/emission.ts).
 */

import type { ProjectRecord } from '@/lib/projects/types';
import { getProductTemplate } from '@/lib/templates/product-templates';
import type { ManifestAssetKind, ProjectAssetManifest, ProjectAssetManifestItem } from './model';
import { createManifestVersion, type ManifestStore } from './repository';

export interface UploadedAssetRef {
  url: string;
  pathname?: string;
}

export interface LaunchPackDeps {
  db: ManifestStore;
  loadProject: (userId: string, projectId: string) => Promise<ProjectRecord | null>;
  buildEpub: (project: ProjectRecord) => Promise<Uint8Array>;
  buildPdf: (project: ProjectRecord) => Promise<Uint8Array>;
  buildHtml: (project: ProjectRecord) => Promise<string>;
  buildMarkdown: (project: ProjectRecord) => Promise<string>;
  buildSlides: (project: ProjectRecord) => Promise<string>;
  /** Blob upload; returns null when Blob is not configured (url stays null). */
  upload: (projectId: string, file: File) => Promise<UploadedAssetRef | null>;
  /** Hash of the current document AST (manifest sourceHash). */
  sourceHashOf: (project: ProjectRecord) => string;
  now?: () => Date;
}

export type LaunchPackResult =
  | {
      ok: true;
      manifest: ProjectAssetManifest;
      generated: ManifestAssetKind[];
      failed: ManifestAssetKind[];
    }
  | { ok: false; error: string };

const DEFAULT_PACK_KINDS: ManifestAssetKind[] = ['epub', 'pdf', 'html', 'markdown'];

const ASSET_FILE_SPEC: Record<
  Exclude<ManifestAssetKind, 'image' | 'mobi' | 'azw3' | 'audio' | 'video'>,
  { extension: string; mimeType: string }
> = {
  epub: { extension: 'epub', mimeType: 'application/epub+zip' },
  pdf: { extension: 'pdf', mimeType: 'application/pdf' },
  html: { extension: 'html', mimeType: 'text/html' },
  markdown: { extension: 'md', mimeType: 'text/markdown' },
  slides: { extension: 'slides.html', mimeType: 'text/html' },
};

/**
 * Resolves which compositor assets the pack produces for a project, from its
 * product template's `derivedAssets` (see module doc for the mapping).
 */
export function resolveLaunchPackPlan(templateId?: string | null): ManifestAssetKind[] {
  const template = getProductTemplate(templateId);
  if (!template) return [...DEFAULT_PACK_KINDS];

  const declared = new Set(template.derivedAssets);
  const kinds: ManifestAssetKind[] = [];
  for (const kind of ['epub', 'pdf', 'html'] as const) {
    if (declared.has(kind)) kinds.push(kind);
  }
  // The Markdown blog derivative is always part of the pack.
  kinds.push('markdown');
  if (declared.has('slides')) kinds.push('slides');
  return kinds;
}

async function buildAssetBytes(
  deps: LaunchPackDeps,
  kind: ManifestAssetKind,
  project: ProjectRecord,
): Promise<Uint8Array | string> {
  switch (kind) {
    case 'epub':
      return deps.buildEpub(project);
    case 'pdf':
      return deps.buildPdf(project);
    case 'html':
      return deps.buildHtml(project);
    case 'markdown':
      return deps.buildMarkdown(project);
    case 'slides':
      return deps.buildSlides(project);
    default:
      throw new Error(`No compositor builder for asset kind: ${kind}`);
  }
}

/**
 * Generates the launch pack and records it as a new manifest version.
 * A single failing format does not abort the pack: it is reported in
 * `failed` and the rest lands in the manifest.
 */
export async function generateLaunchPack(
  deps: LaunchPackDeps,
  input: { userId: string; projectId: string },
): Promise<LaunchPackResult> {
  const project = await deps.loadProject(input.userId, input.projectId);
  if (!project) return { ok: false, error: 'notFound' };

  const plan = resolveLaunchPackPlan(project.templateId);
  const sourceHash = deps.sourceHashOf(project);
  const createdAt = (deps.now ?? (() => new Date()))().toISOString();
  const slug = project.slug || 'proyecto';

  const items: ProjectAssetManifestItem[] = [];
  const generated: ManifestAssetKind[] = [];
  const failed: ManifestAssetKind[] = [];

  for (const kind of plan) {
    const spec = ASSET_FILE_SPEC[kind as keyof typeof ASSET_FILE_SPEC];
    if (!spec) {
      failed.push(kind);
      continue;
    }
    try {
      const bytes = await buildAssetBytes(deps, kind, project);
      const payload = typeof bytes === 'string' ? bytes : bytes.buffer as ArrayBuffer;
      const file = new File([payload], `${slug}.${spec.extension}`, { type: spec.mimeType });
      const uploaded = await deps.upload(input.projectId, file);
      items.push({
        assetId: kind,
        kind,
        url: uploaded?.url ?? null,
        blobKey: uploaded?.pathname ?? null,
        provenance: 'compositor',
        sourceHash,
        createdAt,
      });
      generated.push(kind);
    } catch (error) {
      console.error('[launch-pack] asset generation failed', { projectId: input.projectId, kind, error });
      failed.push(kind);
    }
  }

  if (items.length === 0) return { ok: false, error: 'unavailable' };

  const manifest = await createManifestVersion(deps.db, {
    projectId: input.projectId,
    items,
  });

  return { ok: true, manifest, generated, failed };
}
