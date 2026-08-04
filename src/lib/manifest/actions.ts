'use server';

/**
 * Server actions — launch pack (F2).
 *
 * Thin wrapper over pack.ts: auth + ownership + database gate here, real
 * compositor builders wired here (EPUB/PDF/HTML/Markdown/slides), product
 * logic unit-tested in pack.ts with injected deps.
 */

import { renderToBuffer } from '@react-pdf/renderer';
import { requireUserId } from '@/lib/auth/guards';
import { uploadProjectBlob } from '@/lib/blob/client';
import { resolveProjectBrandTemplateOverrides } from '@/lib/brand/resolve';
import { composeProjectPreview, projectToSemanticDocument } from '@/lib/compose/preview-adapter';
import { getDb, hasDatabase } from '@/lib/db';
import { projectRepository } from '@/lib/db/repositories';
import { documentToMarkdown } from '@/lib/document/to-markdown';
import { buildEpub } from '@/lib/epub';
import type { ProcessingMode } from '@/lib/filestudio/client';
import { buildClientForMode, buildServiceClient } from '@/lib/filestudio/clients';
import { getFileStudioConfig, isFileStudioEnabled } from '@/lib/filestudio/config';
import { delegateEbookFormatsForUser } from '@/lib/filestudio/delegation';
import { optimizeCoverForUser } from '@/lib/filestudio/emission';
import { getConnection } from '@/lib/filestudio/pairing';
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
import {
  buildProjectPdfWithConfig,
  renderProjectExportHtml,
} from '@/lib/projects/export-builder';
import { buildSlidesHtml } from '@/lib/projects/slides-builder';
import { getProductTemplate } from '@/lib/templates/product-templates';
import { hashDocumentAst } from './hash';
import type { ManifestProvenance, ProjectAssetManifestItem } from './model';
import { generateLaunchPack, type LaunchPackDelegationInput, type LaunchPackResult } from './pack';

const EXPORT_CONFIG = DEVICE_PAGINATION_CONFIGS.laptop;

const FILESTUDIO_PROVENANCE: Record<ProcessingMode, ManifestProvenance> = {
  local: 'filestudio-local',
  service: 'filestudio-service',
  // Browser mode never emits from the server; kept for type completeness.
  browser: 'filestudio-service',
};

/**
 * FileStudio delegation for the launch pack (F2): only when the integration
 * is enabled AND the project template declares the derivative keys.
 * - `mobi-azw3`: EPUB → MOBI/AZW3 via Service (Calibre `convert-ebook`).
 * - `cover-derivatives`: the existing 3-resolution cover optimization
 *   (reuses the F1b emission path as-is, consent included; `requiresConsent`
 *   skips the derivatives — the cover panel owns the consent flow).
 * Delegated assets land in the manifest with null url + jobId: the
 * webhook/polling flow (F1b results.ts) materializes them later.
 */
async function delegateFileStudioAssets(
  userId: string,
  input: LaunchPackDelegationInput,
): Promise<ProjectAssetManifestItem[]> {
  if (!isFileStudioEnabled()) return [];
  const config = getFileStudioConfig();
  if (!config) return [];

  const declared = new Set(getProductTemplate(input.project.templateId)?.derivedAssets ?? []);
  const items: ProjectAssetManifestItem[] = [];
  const { sourceHash, createdAt, project } = input;
  const slug = project.slug || 'proyecto';

  const epub = input.assets.find((asset) => asset.kind === 'epub');
  if (declared.has('mobi-azw3') && epub && typeof epub.bytes !== 'string') {
    const result = await delegateEbookFormatsForUser(
      {
        db: getDb(),
        createClient: () => buildServiceClient(config),
      },
      {
        userId,
        projectId: project.id,
        epub: { bytes: epub.bytes, filename: `${slug}.epub` },
        metadata: {
          title: project.document.metadata?.title ?? project.document.title,
          author: project.document.metadata?.author ?? project.document.author,
          language: project.document.metadata?.language ?? project.document.language,
        },
      },
    );
    for (const job of result.jobs ?? []) {
      items.push({
        assetId: job.format,
        kind: job.format,
        url: null,
        blobKey: null,
        provenance: 'filestudio-service',
        sourceHash,
        createdAt,
        jobId: job.id,
      });
    }
  }

  if (declared.has('cover-derivatives')) {
    const result = await optimizeCoverForUser(
      {
        db: getDb(),
        loadProject: (uid, projectId) => projectRepository.getProjectById(uid, projectId),
        loadConnection: (uid) => getConnection(uid),
        createClient: (mode: ProcessingMode) => buildClientForMode(config, userId, mode),
      },
      { userId, projectId: project.id },
    );
    if (result.ok) {
      for (const job of result.jobs) {
        items.push({
          assetId: `cover-${job.width}`,
          kind: 'image',
          url: null,
          blobKey: null,
          provenance: FILESTUDIO_PROVENANCE[result.mode],
          sourceHash,
          createdAt,
          jobId: job.id,
        });
      }
    }
    // `requiresConsent` / noCover / limits: the pack skips the derivatives;
    // the cover panel surfaces those states with their consent flow (F1b).
  }

  return items;
}

export async function generateLaunchPackAction(input: {
  projectId: string;
}): Promise<LaunchPackResult> {
  if (!hasDatabase()) {
    return { ok: false, error: 'unavailable' };
  }

  const userId = await requireUserId();

  try {
    return await generateLaunchPack(
      {
        db: getDb(),
        loadProject: (uid, projectId) => projectRepository.getProjectById(uid, projectId),
        buildEpub: async (project) => {
          const brandOverrides = (await resolveProjectBrandTemplateOverrides(userId, project)) ?? {};
          // Same composition the EPUB route uses: pagination only drives
          // refs/numbering; NAV + NCX carry real H1-H3 levels (tocDepth 3).
          const composed = composeProjectPreview(project, EXPORT_CONFIG, undefined, {
            tocDepth: 3,
            ...brandOverrides,
          });
          return buildEpub(project, composed, { template: brandOverrides });
        },
        buildPdf: async (project) => {
          const brandOverrides = await resolveProjectBrandTemplateOverrides(userId, project);
          const pdfDoc = await buildProjectPdfWithConfig(project, EXPORT_CONFIG, brandOverrides);
          return renderToBuffer(pdfDoc);
        },
        buildHtml: async (project) => {
          const brandOverrides = await resolveProjectBrandTemplateOverrides(userId, project);
          return renderProjectExportHtml(project, EXPORT_CONFIG, brandOverrides);
        },
        buildMarkdown: async (project) =>
          documentToMarkdown(projectToSemanticDocument(project).document),
        buildSlides: async (project) => buildSlidesHtml(project),
        upload: (projectId, file) => uploadProjectBlob(projectId, file),
        sourceHashOf: (project) => hashDocumentAst(projectToSemanticDocument(project).document),
        delegate: (delegationInput) => delegateFileStudioAssets(userId, delegationInput),
      },
      { userId, projectId: input.projectId },
    );
  } catch (error) {
    console.error('[generateLaunchPackAction] failed', { projectId: input.projectId, error });
    return { ok: false, error: 'unavailable' };
  }
}
