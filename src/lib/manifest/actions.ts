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
import { DEVICE_PAGINATION_CONFIGS } from '@/lib/preview/device-configs';
import {
  buildProjectPdfWithConfig,
  renderProjectExportHtml,
} from '@/lib/projects/export-builder';
import { buildSlidesHtml } from '@/lib/projects/slides-builder';
import { hashDocumentAst } from './hash';
import { generateLaunchPack, type LaunchPackResult } from './pack';

const EXPORT_CONFIG = DEVICE_PAGINATION_CONFIGS.laptop;

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
      },
      { userId, projectId: input.projectId },
    );
  } catch (error) {
    console.error('[generateLaunchPackAction] failed', { projectId: input.projectId, error });
    return { ok: false, error: 'unavailable' };
  }
}
