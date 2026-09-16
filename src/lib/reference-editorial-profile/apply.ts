import type { SemanticDocument } from '@/lib/document/model';
import type { CompositionSettings } from '@/lib/projects/composition';
import type { ProjectRecord } from '@/lib/projects/types';
import { hasUsableEditorialEvidence, type ReferenceEditorialProfile } from './model';

export interface ReferenceProfileApplyOptions {
  typography?: boolean;
  headings?: boolean;
  paragraphs?: boolean;
  page?: boolean;
  headersFooters?: boolean;
  toc?: boolean;
  quotesLists?: boolean;
}

const allOptions: Required<ReferenceProfileApplyOptions> = {
  typography: true,
  headings: true,
  paragraphs: true,
  page: true,
  headersFooters: true,
  toc: true,
  quotesLists: true,
};

function pointsToCssPixels(value: number): number {
  return Math.round((value * 96) / 72);
}

/** Applies only extracted rules. It never mutates manuscript blocks or structure. */
export function applyReferenceEditorialProfileToComposition(
  current: CompositionSettings,
  profile: ReferenceEditorialProfile,
  options: ReferenceProfileApplyOptions = {},
): CompositionSettings {
  if (!hasUsableEditorialEvidence(profile)) return { ...current };
  const enabled = { ...allOptions, ...options };
  const next: CompositionSettings = { ...current };
  if (enabled.typography || enabled.paragraphs) {
    if (!next.fontFamily && profile.body.resolvedFontFamily) next.fontFamily = profile.body.resolvedFontFamily;
    if (!next.fontSizePt && profile.body.fontSize) next.fontSizePt = profile.body.fontSize;
    if (!next.lineHeight && profile.body.lineHeight) next.lineHeight = profile.body.lineHeight;
  }
  if (enabled.page) {
    const { margins } = profile.page;
    if (!next.margins && [margins.top, margins.right, margins.bottom, margins.left].every((value) => value !== null)) {
      next.margins = {
        top: pointsToCssPixels(margins.top!),
        right: pointsToCssPixels(margins.right!),
        bottom: pointsToCssPixels(margins.bottom!),
        left: pointsToCssPixels(margins.left!),
      };
    }
  }
  return next;
}

/** Attaches provenance and composition rules while preserving manuscript semantics verbatim. */
export function applyReferenceEditorialProfileToProject(
  project: ProjectRecord,
  profile: ReferenceEditorialProfile,
  options: ReferenceProfileApplyOptions = {},
): ProjectRecord {
  const current = project.document.metadata?.composition ?? {};
  const composition = applyReferenceEditorialProfileToComposition(current, profile, options);
  const metadata = {
    ...(project.document.metadata ?? { title: project.document.title }),
    composition,
    referenceEditorialProfile: profile,
  };
  return {
    ...project,
    updatedAt: new Date().toISOString(),
    document: { ...project.document, metadata },
  };
}

/** Explicitly named helper for callers that work with the canonical AST. */
export function applyReferenceEditorialProfileToDocument(
  document: SemanticDocument,
  profile: ReferenceEditorialProfile,
  options: ReferenceProfileApplyOptions = {},
): SemanticDocument {
  return {
    ...document,
    metadata: {
      ...document.metadata,
      composition: applyReferenceEditorialProfileToComposition(document.metadata.composition ?? {}, profile, options),
      referenceEditorialProfile: profile,
    },
  };
}
