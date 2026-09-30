import { normalizeHtmlContent } from '@/lib/preview/html-normalize';
import { stripAutoBreaks } from '@/lib/preview/editor-page-layout';
import type { ProjectDocument } from './types';

export type SourcePageMapImpact =
  | 'NO_CHANGE'
  | 'METADATA_ONLY'
  | 'NON_LAYOUT_CHANGE'
  | 'LAYOUT_AFFECTING_CHANGE'
  | 'STRUCTURAL_CHANGE';

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, entry]) => [key, stableValue(entry)]),
  );
}

function blockSignature(block: ProjectDocument['chapters'][number]['blocks'][number], index: number) {
  return stableValue({
    index,
    id: block.id,
    type: block.type,
    content: normalizeHtmlContent(stripAutoBreaks(block.content)),
    paragraphProperties: block.paragraphProperties,
  });
}

function chapterStructureSignature(document: ProjectDocument) {
  return document.chapters.map((chapter, index) => ({
    index,
    id: chapter.id,
    order: index,
  }));
}

function chapterLayoutSignature(document: ProjectDocument) {
  return document.chapters.map((chapter, index) => ({
    index,
    id: chapter.id,
    title: normalizeHtmlContent(stripAutoBreaks(chapter.title)),
    semanticType: chapter.semanticType,
    chapterNumber: chapter.chapterNumber,
    blocks: chapter.blocks.map(blockSignature),
    images: stableValue(chapter.images ?? []),
    imageCanvasHeight: chapter.imageCanvasHeight,
  }));
}

function documentLayoutSignature(document: ProjectDocument) {
  return stableValue({
    language: document.language,
    chapters: chapterLayoutSignature(document),
    rules: document.rules ?? null,
    documentModel: document.documentModel ?? null,
  });
}

export function classifySourcePageMapImpact(
  previous: ProjectDocument,
  next: ProjectDocument,
): SourcePageMapImpact {
  if (JSON.stringify(documentLayoutSignature(previous)) === JSON.stringify(documentLayoutSignature(next))) {
    if (previous.title === next.title && previous.subtitle === next.subtitle && previous.author === next.author) {
      return 'NO_CHANGE';
    }
    return 'METADATA_ONLY';
  }

  if (JSON.stringify(chapterStructureSignature(previous)) !== JSON.stringify(chapterStructureSignature(next))) {
    return 'STRUCTURAL_CHANGE';
  }

  return 'LAYOUT_AFFECTING_CHANGE';
}

export function documentExtrasAffectSourcePageMap(
  previous: ProjectDocument,
  next: ProjectDocument,
): boolean {
  return JSON.stringify(stableValue({
    rules: previous.rules ?? null,
    documentModel: previous.documentModel ?? null,
    composition: previous.metadata?.composition ?? null,
    userOverrides: previous.metadata?.userOverrides ?? null,
  })) !== JSON.stringify(stableValue({
    rules: next.rules ?? null,
    documentModel: next.documentModel ?? null,
    composition: next.metadata?.composition ?? null,
    userOverrides: next.metadata?.userOverrides ?? null,
  }));
}
