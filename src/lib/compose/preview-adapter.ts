/**
 * Preview/export adapter — bridges the composition engine (FASE C) to the
 * stable `PreviewPage[]` contract consumed by `export-builder.tsx`,
 * `PreviewModal` and the TOC numbering pipeline.
 *
 * Contract preserved from `preview-builder.ts`:
 * - Page 1 is the cover (`type: 'cover'`, `coverData`), content pages follow
 *   with global numbering (2+), back-cover last.
 * - Content pages carry HTML in the existing dialect (same tags the editor,
 *   export and surface renderer understand); ref tokens are materialized as
 *   `<span data-ref-kind data-ref-target>LABEL</span>`.
 * - The project TOC chapter (isTocChapter) is replaced by the **generated**
 *   TOC using the established `<p data-toc-entry data-toc-level data-toc-page>`
 *   + `<span class="toc-title">` format.
 * - Project chapters never share a page (forced chapter starts in the engine).
 *
 * Split paragraphs are reconstructed as plain-text fragments via
 * `wrapTextLines` with the same measurer the engine used (inline marks are
 * flattened inside split fragments only; unsplit blocks keep full fidelity).
 */

import type { ProjectRecord } from '@/lib/projects/types';
import { chapterBlocksToHtml } from '@/lib/projects/chapter-html';
import { createDefaultSurfaceState, normalizeSurfaceState } from '@/lib/projects/cover-surface';
import { resolveBackCoverSurfaceFields } from '@/lib/projects/back-cover-surface-resolver';
import { resolveCoverSurfaceFields } from '@/lib/projects/cover-surface-resolver';
import {
  DocumentBlock,
  SemanticDocument,
  ensureBlockIds,
  inlineToPlainText,
} from '@/lib/document/model';
import { htmlToBlocks } from '@/lib/document/from-html';
import { blocksToHtml } from '@/lib/document/to-html';
import type { PaginationConfig } from '@/lib/preview/device-configs';
import { isTocChapter, type PreviewPage } from '@/lib/preview/preview-builder';
import { ComposeResult, ComposeTemplate, compose } from './compose';
import { TextMeasurer, createHeuristicMeasurer, wrapTextLines } from './measure';

export type { PreviewPage };

export interface ComposedPreview {
  pages: PreviewPage[];
  /** Raw engine output (TOC, numbering, refs, violations). */
  result: ComposeResult;
}

const EMPTY_CHAPTER_PLACEHOLDER = '<p><em>Contenido aún no disponible</em></p>';

export function templateFromPaginationConfig(config: PaginationConfig): ComposeTemplate {
  return {
    pageWidth: config.pageWidth,
    pageHeight: config.pageHeight,
    margins: {
      top: config.marginTop,
      bottom: config.marginBottom,
      left: config.marginLeft,
      right: config.marginRight,
    },
    baseFontSize: config.fontSize,
    lineHeight: config.lineHeight,
  };
}

interface ProjectChapterInfo {
  id: string;
  title: string;
  isToc: boolean;
}

/**
 * Converts the persisted project (HTML chapters or, when present, the stored
 * semantic model — lazy migration path) into a SemanticDocument plus the
 * chapter-start anchors that preserve project-chapter page fidelity.
 */
export function projectToSemanticDocument(project: ProjectRecord): {
  document: SemanticDocument;
  chapterStartIds: string[];
  chapterById: Map<string, ProjectChapterInfo>;
} {
  const metadata = project.document.metadata ?? {
    title: project.document.title,
    subtitle: project.document.subtitle || undefined,
    author: project.document.author || undefined,
    language: project.document.language,
  };

  const chapterById = new Map<string, ProjectChapterInfo>();

  if (project.document.documentModel) {
    // Stored model is the source of truth; chapter anchors still come from
    // the persisted chapters so pages never mix project chapters.
    return {
      document: project.document.documentModel,
      chapterStartIds: [],
      chapterById,
    };
  }

  const parsedChapters: DocumentBlock[][] = [];
  const chapterInfos: ProjectChapterInfo[] = [];
  for (const chapter of project.document.chapters) {
    const html = chapterBlocksToHtml(chapter.blocks);
    const chapterBlocks = htmlToBlocks(html);
    if (chapterBlocks.length === 0) {
      continue;
    }
    parsedChapters.push(chapterBlocks);
    chapterInfos.push({ id: chapter.id, title: chapter.title, isToc: isTocChapter(chapter.title) });
  }

  // Deduplicate ids across chapters (each chapter is parsed independently and
  // generated ids like `h-1-p` would otherwise collide).
  const blocks = ensureBlockIds(parsedChapters.flat());
  const chapterStartIds: string[] = [];
  let offset = 0;
  parsedChapters.forEach((chapterBlocks, index) => {
    const firstId = blocks[offset].id;
    chapterStartIds.push(firstId);
    chapterById.set(firstId, chapterInfos[index]);
    offset += chapterBlocks.length;
  });

  return {
    document: { version: 1, metadata, blocks },
    chapterStartIds,
    chapterById,
  };
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function serializePlacement(
  placement: ComposeResult['pages'][number]['placements'][number],
  block: DocumentBlock,
  refs: Record<string, string>,
  measurer: TextMeasurer,
  contentWidth: number,
  fontSize: number,
): string {
  if (block.type === 'pageBreak') return '';

  if (block.type === 'paragraph' && placement.fromLine !== undefined) {
    const text = inlineToPlainText(block.content);
    const lines = wrapTextLines(text, { contentWidth, fontSize }, measurer);
    const fragment = lines
      .slice(placement.fromLine - 1, placement.toLine ?? lines.length)
      .join(' ');
    return fragment ? `<p>${escapeHtml(fragment)}</p>` : '';
  }

  if (block.type === 'list' && placement.fromItem !== undefined) {
    const sliced: DocumentBlock = {
      ...block,
      items: block.items.slice(placement.fromItem, (placement.toItem ?? placement.fromItem) + 1),
    };
    return blocksToHtml([sliced], refs);
  }

  return blocksToHtml([block], refs);
}

/** Generated TOC HTML in the established data-toc-* contract format. */
export function buildGeneratedTocHtml(
  result: ComposeResult,
  pageNumberOffset: number,
): string {
  const pageIndexByBlock = new Map<string, number>();
  for (const page of result.pages) {
    for (const placement of page.placements) {
      if (!pageIndexByBlock.has(placement.blockId)) {
        pageIndexByBlock.set(placement.blockId, page.index);
      }
    }
  }
  return result.toc
    .map((entry) => {
      const pageIndex = pageIndexByBlock.get(entry.blockId);
      const globalPage = pageIndex !== undefined ? pageIndex + pageNumberOffset : entry.pageNumber;
      return (
        `<p data-toc-entry="true" data-toc-level="${entry.level}" data-toc-page="${globalPage}">` +
        `<span class="toc-title">${escapeHtml(entry.text)}</span></p>`
      );
    })
    .join('');
}

/**
 * Composes a project with the engine and adapts the result to the stable
 * `PreviewPage[]` contract. Drop-in replacement for `buildPreviewPages`.
 */
export function composeProjectPreview(
  project: ProjectRecord,
  config: PaginationConfig,
  measurer?: TextMeasurer,
): ComposedPreview {
  const template = templateFromPaginationConfig(config);
  const { document, chapterStartIds, chapterById } = projectToSemanticDocument(project);
  const result = compose(document, project.document.rules, template, measurer, {
    ...(chapterStartIds.length > 0 ? { chapterStartIds } : {}),
    // Printed page numbers include the cover (page 1).
    pageIndexOffset: 1,
  });

  const resolvedMeasurer = measurer ?? createHeuristicMeasurer();
  const blockById = new Map(document.blocks.map((block) => [block.id, block]));
  const contentWidth =
    template.pageWidth - template.margins.left - template.margins.right;

  const pages: PreviewPage[] = [];

  // PAGE 1: cover (contract-identical to buildPreviewPages).
  const coverFallback = createDefaultSurfaceState('cover');
  const coverState = normalizeSurfaceState(project.cover.surfaceState ?? coverFallback);
  const coverFields = {
    ...coverState.fields,
    ...resolveCoverSurfaceFields(project, coverState),
  };
  pages.push({
    type: 'cover',
    content: null,
    coverData: {
      title: coverFields.title?.value || project.cover.title || 'Proyecto sin título',
      subtitle: coverFields.subtitle?.value ?? '',
      author: coverFields.author?.value || project.document.author || 'Autor desconocido',
      palette: project.cover.palette,
      renderedImageUrl: project.cover.renderedImageUrl ?? null,
      backgroundImageUrl: project.cover.backgroundImageUrl ?? null,
      showSubtitle: coverFields.subtitle?.visible ?? false,
    },
    pageNumber: 1,
  });

  let globalPageNumber = 2;
  const tocHtml = buildGeneratedTocHtml(result, 1);
  const tocChapterServed = new Set<string>();

  if (document.blocks.length === 0) {
    pages.push({ type: 'content', content: EMPTY_CHAPTER_PLACEHOLDER, pageNumber: globalPageNumber });
    globalPageNumber += 1;
  }

  for (const page of result.pages) {
    const chapterInfo = page.chapterId ? chapterById.get(page.chapterId) : undefined;

    let html: string;
    if (chapterInfo?.isToc) {
      // TOC chapter: fully generated, never from persisted content.
      if (tocChapterServed.has(chapterInfo.id)) continue;
      tocChapterServed.add(chapterInfo.id);
      html = tocHtml;
    } else {
      html = page.placements
        .map((placement) => {
          const block = blockById.get(placement.blockId);
          if (!block) return '';
          return serializePlacement(
            placement,
            block,
            result.refs,
            resolvedMeasurer,
            contentWidth,
            template.baseFontSize,
          );
        })
        .join('');
    }

    if (!html && !page.blank) continue;
    pages.push({
      type: 'content',
      content: html,
      chapterTitle: chapterInfo?.title,
      chapterId: chapterInfo?.id,
      pageNumber: globalPageNumber,
    });
    globalPageNumber += 1;
  }

  // BACK COVER (contract-identical).
  if (project.backCover) {
    const backFallback = createDefaultSurfaceState('back-cover');
    const backState = normalizeSurfaceState(project.backCover.surfaceState ?? backFallback);
    const backFields = {
      ...backState.fields,
      ...resolveBackCoverSurfaceFields(project, backState),
    };
    pages.push({
      type: 'back-cover',
      content: null,
      backCoverData: {
        title: backFields.title?.value || project.backCover.title || project.document.title,
        body: backFields.body?.visible ? backFields.body.value : '',
        authorBio: backFields.authorBio?.visible ? backFields.authorBio.value : '',
        renderedImageUrl: project.backCover.renderedImageUrl ?? null,
        backgroundImageUrl: project.backCover.backgroundImageUrl ?? null,
      },
      pageNumber: globalPageNumber,
    });
  }

  return { pages, result };
}

/**
 * Flow HTML for `MultipageFlow`/`PreviewModal`: page HTML joined by manual
 * page-break markers (same shape as `buildPreviewContentFlowHtml`).
 */
export function buildComposedFlowHtml(pages: PreviewPage[]): string {
  return pages
    .filter((page) => page.type === 'content')
    .map((page) => page.content ?? '')
    .filter((html) => html.trim().length > 0)
    .join('<hr data-page-break="manual">');
}
