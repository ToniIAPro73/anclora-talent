import { isFixedPdfProject, type ProjectRecord } from './types';

/**
 * Single source of truth for what a project can do, derived from its
 * document mode. Consumers (UI, export routes, launch pack, sales actions)
 * must branch on these flags instead of re-deriving `isFixedPdfProject`
 * checks independently, so the fixed-pdf/editable contract can't drift
 * out of sync between surfaces (see sdd/features/feature-fixed-pdf-document-mode).
 */
export interface ProjectCapabilities {
  canEditContent: boolean;
  canEditCover: boolean;
  canCompose: boolean;
  canExportOriginalPdf: boolean;
  canExportDocx: boolean;
  canExportEpub: boolean;
  canExportHtml: boolean;
  canExportMarkdown: boolean;
  canGenerateCommercialAssets: boolean;
  canGenerateLaunchPack: boolean;
  canCreateEditableCopy: boolean;
}

export function getProjectCapabilities(project: ProjectRecord): ProjectCapabilities {
  const fixedPdf = isFixedPdfProject(project);

  return {
    canEditContent: !fixedPdf,
    canEditCover: !fixedPdf,
    canCompose: !fixedPdf,
    canExportOriginalPdf: true,
    canExportDocx: !fixedPdf,
    canExportEpub: !fixedPdf,
    canExportHtml: !fixedPdf,
    canExportMarkdown: !fixedPdf,
    canGenerateCommercialAssets: true,
    canGenerateLaunchPack: true,
    canCreateEditableCopy: fixedPdf,
  };
}
