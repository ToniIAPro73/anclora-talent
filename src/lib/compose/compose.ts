/**
 * Composition engine — Anclora Talent (FASE C).
 *
 * `compose(document, rules, template)` is a pure, deterministic projection:
 * the same input always produces the same paginated composition, with no
 * global state. Pagination is *derived*, never stored: authors edit content
 * and rules, the engine recomposes.
 *
 * Output: pages with block placements, a fully generated TOC, resolved
 * figure/table/page numbering and cross references, plus rule violations
 * for the "document health" panel.
 *
 * Incremental recomposition: because chapters always begin on a page
 * boundary (rule priority 2), pages from chapters before the edited one are
 * byte-identical. `composeIncremental` reuses them and recomposes only from
 * the affected chapter forward, then rebuilds the global indexes (TOC,
 * numbering, refs). `composeIncremental(...) === compose(...)` is a tested
 * invariant.
 */

import {
  DocumentBlock,
  SemanticDocument,
  inlineToPlainText,
} from '@/lib/document/model';
import { TextMeasurer, createHeuristicMeasurer } from './measure';
import { DocumentRules, formatPageNumber, resolveDocumentRules } from './rules';

export interface ComposeTemplate {
  pageWidth: number;
  pageHeight: number;
  margins: { top: number; bottom: number; left: number; right: number };
  baseFontSize: number;
  /** Unitless multiplier (e.g. 1.5). */
  lineHeight: number;
  /** Heading level that opens a new chapter (default 1). */
  chapterLevel?: number;
  /** Deepest heading level included in the generated TOC (default chapterLevel + 1). */
  tocDepth?: number;
  /** Content font family, forwarded to canvas measurers. */
  fontFamily?: string;
}

export interface BlockPlacement {
  blockId: string;
  /** For split paragraphs: 1-based line range of the fragment on this page. */
  fromLine?: number;
  toLine?: number;
  /** For split lists: 0-based item range (inclusive) on this page. */
  fromItem?: number;
  toItem?: number;
}

export interface ComposedPage {
  /** 0-based index in the content page sequence. */
  index: number;
  /** Materialized page number (respects numbering.pageNumberFormat). */
  pageNumber: string;
  chapterId?: string;
  placements: BlockPlacement[];
  /** Padding page inserted for odd-page chapter starts. */
  blank?: boolean;
}

export interface TocEntry {
  blockId: string;
  level: number;
  text: string;
  pageNumber: string;
}

export interface ComposeViolation {
  /** 0-based page index where the violation is visible. */
  page: number;
  blockId: string;
  /** Rule key, e.g. 'keepTogether.table'. */
  rule: string;
  message: string;
}

export interface ComposedChapter {
  id: string;
  title: string;
  /** 0-based index of the first page of this chapter. */
  startPage: number;
}

export interface ComposeResult {
  pages: ComposedPage[];
  chapters: ComposedChapter[];
  toc: TocEntry[];
  /** figure/table numbering, keyed by block id (e.g. "2.1"). */
  figures: Record<string, string>;
  tables: Record<string, string>;
  /** Resolved cross-reference labels, keyed by ref targetId. */
  refs: Record<string, string>;
  violations: ComposeViolation[];
}

interface ChapterSlice {
  heading: DocumentBlock | null;
  blocks: DocumentBlock[];
}

const HEADING_LINE_HEIGHTS: Record<number, number> = { 1: 4, 2: 3, 3: 3, 4: 2, 5: 2, 6: 2 };
const IMAGE_DEFAULT_LINES = 12;

interface MeasuredBlock {
  block: DocumentBlock;
  /** Total height in base lines. */
  lines: number;
  /** Per-item heights for lists. */
  itemLines?: number[];
  /** Paragraph line count (== lines) when splittable. */
  textLines?: number;
}

interface EngineContext {
  rules: DocumentRules;
  capacity: number;
  measurer: TextMeasurer;
  contentWidth: number;
  baseFontSize: number;
}

function measureBlock(block: DocumentBlock, ctx: EngineContext): MeasuredBlock {
  const { measurer, contentWidth, baseFontSize } = ctx;
  switch (block.type) {
    case 'heading':
      return { block, lines: HEADING_LINE_HEIGHTS[block.level] ?? 2 };
    case 'paragraph': {
      const text = inlineToPlainText(block.content);
      const textLines = text
        ? measurer.measureLines({ text, contentWidth, fontSize: baseFontSize })
        : 1;
      return { block, lines: textLines, textLines };
    }
    case 'list': {
      const itemLines = block.items.map((item) => {
        const text = inlineToPlainText(item);
        return text ? measurer.measureLines({ text, contentWidth, fontSize: baseFontSize }) : 1;
      });
      return { block, itemLines, lines: itemLines.reduce((a, b) => a + b, 0) };
    }
    case 'table': {
      const lines = block.rows.length + (block.caption ? 1 : 0);
      return { block, lines: Math.max(1, lines) };
    }
    case 'image': {
      const lines = (block.estimatedLines ?? IMAGE_DEFAULT_LINES) + (block.caption ? 1 : 0);
      return { block, lines };
    }
    case 'quote': {
      const text = inlineToPlainText(block.content);
      const textLines = text
        ? measurer.measureLines({ text, contentWidth: contentWidth * 0.92, fontSize: baseFontSize })
        : 2;
      return { block, lines: Math.max(2, textLines) + 1, textLines };
    }
    case 'callout': {
      const text = inlineToPlainText(block.content);
      const textLines = text
        ? measurer.measureLines({ text, contentWidth, fontSize: baseFontSize })
        : 1;
      return { block, lines: textLines + 2 };
    }
    case 'code': {
      const codeLines = block.code.split('\n').length;
      return { block, lines: codeLines + 2 };
    }
    case 'pageBreak':
      return { block, lines: 0 };
  }
}

function isKeepTogetherBlock(measured: MeasuredBlock, ctx: EngineContext): boolean {
  const { rules } = ctx;
  const { block } = measured;
  switch (block.type) {
    case 'table':
      return rules.keepTogether.table;
    case 'image':
      return block.caption ? rules.keepTogether.imageWithCaption : false;
    case 'code':
      return rules.keepTogether.code;
    case 'quote':
      return rules.keepTogether.quote;
    case 'callout':
      return rules.keepTogether.callout;
    case 'list':
      return block.items.length <= rules.keepTogether.list.maxItems;
    default:
      return false;
  }
}

/** Rule key used in violations for keep-together blocks, in documented priority order. */
function keepTogetherRuleKey(block: DocumentBlock): string {
  switch (block.type) {
    case 'table': return 'keepTogether.table';
    case 'image': return 'keepTogether.imageWithCaption';
    case 'code': return 'keepTogether.code';
    case 'quote': return 'keepTogether.quote';
    case 'callout': return 'keepTogether.callout';
    case 'list': return 'keepTogether.list';
    default: return 'keepTogether';
  }
}

interface PageDraft {
  placements: BlockPlacement[];
  used: number;
}

function flushPage(pages: PageDraft[], current: PageDraft): PageDraft {
  pages.push(current);
  return { placements: [], used: 0 };
}

/**
 * Linear paginator for one chapter's blocks. Applies rules in the documented
 * priority order. `startPageIndex` is the 0-based global page index where
 * this chapter begins (for violation reporting).
 */
function paginateChapter(
  measured: MeasuredBlock[],
  ctx: EngineContext,
  startPageIndex: number,
  violations: ComposeViolation[],
): PageDraft[] {
  const pages: PageDraft[] = [];
  let current: PageDraft = { placements: [], used: 0 };
  const capacity = ctx.capacity;
  const report = (blockId: string, rule: string, message: string) => {
    violations.push({ page: startPageIndex + pages.length, blockId, rule, message });
  };

  for (let i = 0; i < measured.length; i += 1) {
    const m = measured[i];
    const { block } = m;

    // Priority 1: explicit page break.
    if (block.type === 'pageBreak') {
      if (current.used > 0 || current.placements.length > 0) {
        current = flushPage(pages, current);
      }
      continue;
    }

    // Priority 3: headings keep with the following content.
    if (
      block.type === 'heading' &&
      ctx.rules.keepWithNext.headingLevels.includes(block.level)
    ) {
      const next = measured[i + 1];
      const needed =
        m.lines + Math.min(ctx.rules.keepWithNext.minLinesAfter, next?.lines ?? 0);
      const hasFollowing = next !== undefined && next.block.type !== 'pageBreak';
      if (hasFollowing && current.used + needed > capacity && current.used > 0) {
        current = flushPage(pages, current);
      }
      current.placements.push({ blockId: block.id });
      current.used += m.lines;
      continue;
    }

    // Priority 4: keep-together blocks.
    if (isKeepTogetherBlock(m, ctx)) {
      if (m.lines > capacity) {
        // Impossible rule: split at the boundary, emit a violation.
        report(
          block.id,
          keepTogetherRuleKey(block),
          `Block of ${m.lines} lines exceeds page capacity (${capacity}); split despite ${keepTogetherRuleKey(block)}.`,
        );
        placeSplittable(m);
        continue;
      }
      if (current.used + m.lines > capacity) {
        if (block.type === 'table' && ctx.rules.keepTogether.tableFillGap === 'next-float') {
          // Try to fill the gap with following floatable paragraphs.
          let j = i + 1;
          while (j < measured.length) {
            const candidate = measured[j];
            if (candidate.block.type !== 'paragraph') break;
            if (current.used + candidate.lines > capacity) break;
            current.placements.push({ blockId: candidate.block.id });
            current.used += candidate.lines;
            j += 1;
          }
          measured.splice(i + 1, j - (i + 1));
        }
        current = flushPage(pages, current);
      }
      current.placements.push({ blockId: block.id });
      current.used += m.lines;
      continue;
    }

    // Splittable blocks: paragraphs (widows/orphans) and long lists.
    placeSplittable(m);
  }

  function placeSplittable(m: MeasuredBlock): void {
    const { block } = m;
    if (block.type === 'paragraph' && m.textLines !== undefined) {
      const min = ctx.rules.widowsOrphans.minLines;
      let remaining = m.textLines;
      let fromLine = 1;
      while (remaining > 0) {
        const space = capacity - current.used;
        if (space <= 0) {
          current = flushPage(pages, current);
          continue;
        }
        if (remaining <= space) {
          current.placements.push(
            fromLine === 1
              ? { blockId: block.id }
              : { blockId: block.id, fromLine, toLine: fromLine + remaining - 1 },
          );
          current.used += remaining;
          remaining = 0;
        } else {
          const take = Math.floor(space);
          const rest = remaining - take;
          if (take < min || rest < min) {
            // Widows/orphans (priority 5): move the whole paragraph.
            if (m.textLines! <= capacity) {
              current = flushPage(pages, current);
              continue;
            }
            // Paragraph longer than a page: split anyway, violation.
            report(
              block.id,
              'widowsOrphans',
              `Paragraph split with fewer than ${min} lines on one side of the boundary.`,
            );
          }
          current.placements.push({ blockId: block.id, fromLine, toLine: fromLine + take - 1 });
          current.used += take;
          fromLine += take;
          remaining -= take;
          current = flushPage(pages, current);
        }
      }
      return;
    }

    if (block.type === 'list' && m.itemLines) {
      // Long lists (priority 4 list rule exceeded): split between items only.
      for (let item = 0; item < block.items.length; item += 1) {
        const itemHeight = m.itemLines[item];
        if (current.used + itemHeight > capacity && current.used > 0) {
          current = flushPage(pages, current);
        }
        const last = current.placements[current.placements.length - 1];
        if (last?.blockId === block.id && last.toItem === item - 1) {
          last.toItem = item;
        } else {
          current.placements.push({ blockId: block.id, fromItem: item, toItem: item });
        }
        current.used += itemHeight;
      }
      return;
    }

    // Other splittable content (oversized keep-together fallback): place inline.
    if (current.used + m.lines > capacity && current.used > 0) {
      current = flushPage(pages, current);
    }
    current.placements.push({ blockId: block.id });
    current.used += m.lines;
  }

  if (current.placements.length > 0 || pages.length === 0) {
    pages.push(current);
  }
  return pages;
}

function splitChapters(
  blocks: DocumentBlock[],
  chapterLevel: number,
  chapterStartIds?: Set<string>,
): ChapterSlice[] {
  const chapters: ChapterSlice[] = [];
  let currentSlice: ChapterSlice = { heading: null, blocks: [] };
  // When explicit chapter starts are provided (project-chapter fidelity in
  // the preview/export adapter), they are the only boundaries honored.
  const forcedOnly = (chapterStartIds?.size ?? 0) > 0;
  for (const block of blocks) {
    const isChapterHeading = block.type === 'heading' && block.level === chapterLevel;
    const isStart = forcedOnly ? chapterStartIds!.has(block.id) : isChapterHeading;
    if (isStart) {
      if (currentSlice.heading || currentSlice.blocks.length > 0) {
        chapters.push(currentSlice);
      }
      currentSlice = {
        heading: isChapterHeading ? block : null,
        blocks: [block],
      };
    } else {
      currentSlice.blocks.push(block);
    }
  }
  if (currentSlice.heading || currentSlice.blocks.length > 0) {
    chapters.push(currentSlice);
  }
  return chapters;
}

interface GlobalIndexes {
  chapters: ComposedChapter[];
  toc: TocEntry[];
  figures: Record<string, string>;
  tables: Record<string, string>;
  refs: Record<string, string>;
}

function buildGlobalIndexes(
  document: SemanticDocument,
  pages: ComposedPage[],
  template: ComposeTemplate,
  rules: DocumentRules,
  slices: ChapterSlice[],
  chapterStartPages: number[],
): GlobalIndexes {
  const chapterLevel = template.chapterLevel ?? 1;
  const tocDepth = template.tocDepth ?? chapterLevel + 1;
  const pageOfBlock = new Map<string, number>();
  pages.forEach((page, position) => {
    for (const placement of page.placements) {
      if (!pageOfBlock.has(placement.blockId)) {
        pageOfBlock.set(placement.blockId, position);
      }
    }
  });

  const chapters: ComposedChapter[] = [];
  const toc: TocEntry[] = [];
  const figures: Record<string, string> = {};
  const tables: Record<string, string> = {};
  const refs: Record<string, string> = {};

  let figureCounter = 0;
  let tableCounter = 0;

  slices.forEach((slice, chapterIndex) => {
    const chapterNumber = chapterIndex + 1;
    const heading = slice.heading;
    const chapterId = heading?.id ?? slice.blocks[0]?.id ?? `front-${chapterIndex}`;
    const title = heading?.type === 'heading' ? inlineToPlainText(heading.content) : '';
    chapters.push({ id: chapterId, title, startPage: chapterStartPages[chapterIndex] });
    refs[chapterId] = String(chapterNumber);

    if (rules.numbering.restartFiguresPerChapter) figureCounter = 0;
    if (rules.numbering.restartTablesPerChapter) tableCounter = 0;

    for (const block of slice.blocks) {
      const pageIndex = pageOfBlock.get(block.id);
      const pageNumber = pageIndex !== undefined ? pages[pageIndex].pageNumber : '?';

      if (block.type === 'heading' && block.level <= tocDepth) {
        toc.push({
          blockId: block.id,
          level: block.level,
          text: inlineToPlainText(block.content),
          pageNumber,
        });
      }
      if (block.type === 'image' && block.caption) {
        figureCounter += 1;
        figures[block.id] = rules.numbering.restartFiguresPerChapter
          ? `${chapterNumber}.${figureCounter}`
          : String(figureCounter);
        refs[block.id] = figures[block.id];
      }
      if (block.type === 'table') {
        tableCounter += 1;
        tables[block.id] = rules.numbering.restartTablesPerChapter
          ? `${chapterNumber}.${tableCounter}`
          : String(tableCounter);
        refs[block.id] = tables[block.id];
      }
    }
  });

  return { chapters, toc, figures, tables, refs };
}

function makeContext(
  rules: DocumentRules,
  template: ComposeTemplate,
  measurer: TextMeasurer,
): EngineContext {
  const usable = template.pageHeight - template.margins.top - template.margins.bottom;
  const linePx = template.baseFontSize * template.lineHeight;
  return {
    rules,
    capacity: Math.max(1, Math.floor(usable / linePx)),
    measurer,
    contentWidth: template.pageWidth - template.margins.left - template.margins.right,
    baseFontSize: template.baseFontSize,
  };
}

interface ChapterComposition {
  pages: PageDraft[];
  blanksBefore: number;
  violations: ComposeViolation[];
}

function composeChapters(
  slices: ChapterSlice[],
  ctx: EngineContext,
  firstPageIndex: number,
): { compositions: ChapterComposition[]; totalPages: number } {
  const compositions: ChapterComposition[] = [];
  let nextPageIndex = firstPageIndex;

  slices.forEach((slice, index) => {
    const violations: ComposeViolation[] = [];
    let blanksBefore = 0;
    const isChapter = slice.heading !== null;

    // Priority 2: chapters always begin on a page boundary; optionally the
    // boundary must be an odd (recto) page, padding with a blank page.
    // The check also applies to the first slice when recomposing from a
    // nonzero offset (incremental path).
    if (isChapter && (index > 0 || firstPageIndex > 0) && ctx.rules.chapterStartsOnOddPage) {
      // Page numbers are 1-based: page at index p shows number p + 1.
      const nextNumber = nextPageIndex + 1;
      if (nextNumber % 2 === 0) blanksBefore = 1;
    }
    nextPageIndex += blanksBefore;

    const measured = slice.blocks.map((block) => measureBlock(block, ctx));
    const pages = paginateChapter(measured, ctx, nextPageIndex, violations);
    compositions.push({ pages, blanksBefore, violations });
    nextPageIndex += pages.length;
  });

  return { compositions, totalPages: nextPageIndex };
}

function materialize(
  compositions: ChapterComposition[],
  slices: ChapterSlice[],
  ctx: EngineContext,
  indexOffset: number,
): { pages: ComposedPage[]; chapterStartPages: number[]; violations: ComposeViolation[] } {
  const pages: ComposedPage[] = [];
  const chapterStartPages: number[] = [];
  const violations: ComposeViolation[] = [];
  const pageFormat = ctx.rules.numbering.pageNumberFormat;

  compositions.forEach((composition, chapterIndex) => {
    for (let b = 0; b < composition.blanksBefore; b += 1) {
      const globalIndex = indexOffset + pages.length;
      pages.push({
        index: globalIndex,
        pageNumber: formatPageNumber(globalIndex + 1, pageFormat),
        placements: [],
        blank: true,
      });
    }
    chapterStartPages.push(indexOffset + pages.length);
    const chapterId =
      slices[chapterIndex].heading?.id ??
      slices[chapterIndex].blocks[0]?.id ??
      `front-${chapterIndex}`;
    composition.pages.forEach((draft) => {
      const globalIndex = indexOffset + pages.length;
      pages.push({
        index: globalIndex,
        pageNumber: formatPageNumber(globalIndex + 1, pageFormat),
        chapterId,
        placements: draft.placements,
      });
    });
    violations.push(...composition.violations);
  });

  return { pages, chapterStartPages, violations };
}

/** Optional composition controls beyond layout (template) and rules. */
export interface ComposeOptions {
  /**
   * Block ids that force a new chapter boundary. When provided and non-empty,
   * they are the only chapter boundaries honored (project-chapter fidelity
   * for the preview/export adapter).
   */
  chapterStartIds?: string[];
  /**
   * 0-based index assigned to the first composed page (default 0). The
   * preview/export adapter passes 1 so printed page numbers include the
   * cover as page 1, making `chapterStartsOnOddPage` refer to the printed
   * (recto) page number.
   */
  pageIndexOffset?: number;
}

/**
 * Full composition. Pure and deterministic: same input → same output.
 * `measurer` defaults to the deterministic heuristic; production injects a
 * canvas (browser) or server-equivalent measurer.
 */
export function compose(
  document: SemanticDocument,
  rules?: Partial<DocumentRules> | null,
  template?: ComposeTemplate,
  measurer?: TextMeasurer,
  options?: ComposeOptions,
): ComposeResult {
  const resolvedRules = resolveDocumentRules(rules);
  const resolvedTemplate: ComposeTemplate = template ?? {
    pageWidth: 576,
    pageHeight: 864,
    margins: { top: 96, bottom: 96, left: 96, right: 96 },
    baseFontSize: 16,
    lineHeight: 1.5,
  };
  const ctx = makeContext(resolvedRules, resolvedTemplate, measurer ?? createHeuristicMeasurer());
  const chapterLevel = resolvedTemplate.chapterLevel ?? 1;
  const startIds = options?.chapterStartIds ? new Set(options.chapterStartIds) : undefined;
  const slices = splitChapters(document.blocks, chapterLevel, startIds);

  const firstPageIndex = options?.pageIndexOffset ?? 0;
  const { compositions } = composeChapters(slices, ctx, firstPageIndex);
  const { pages, chapterStartPages, violations } = materialize(compositions, slices, ctx, firstPageIndex);
  const indexes = buildGlobalIndexes(
    document,
    pages,
    resolvedTemplate,
    resolvedRules,
    slices,
    chapterStartPages,
  );

  return { pages, violations, ...indexes };
}

/**
 * Incremental recomposition (C2). Given the previous result and the id of
 * the block that changed, reuses pages from chapters before the affected one
 * and recomposes only from that chapter forward. Output is identical to a
 * full `compose` — this equality is enforced by tests.
 *
 * If the changed block is not found in the previous result (structural
 * change: paste, reimport), a full compose is performed.
 */
export function composeIncremental(
  previous: ComposeResult,
  document: SemanticDocument,
  changedBlockId: string,
  rules?: Partial<DocumentRules> | null,
  template?: ComposeTemplate,
  measurer?: TextMeasurer,
  options?: ComposeOptions,
): ComposeResult {
  const resolvedRules = resolveDocumentRules(rules);
  const resolvedTemplate: ComposeTemplate = template ?? {
    pageWidth: 576,
    pageHeight: 864,
    margins: { top: 96, bottom: 96, left: 96, right: 96 },
    baseFontSize: 16,
    lineHeight: 1.5,
  };
  const ctx = makeContext(resolvedRules, resolvedTemplate, measurer ?? createHeuristicMeasurer());
  const chapterLevel = resolvedTemplate.chapterLevel ?? 1;
  const startIds = options?.chapterStartIds ? new Set(options.chapterStartIds) : undefined;
  const slices = splitChapters(document.blocks, chapterLevel, startIds);

  // Locate the chapter containing the changed block.
  const changedChapterIndex = slices.findIndex((slice) =>
    slice.blocks.some((block) => block.id === changedBlockId),
  );
  if (changedChapterIndex <= 0) {
    return compose(document, rules, template, measurer, options);
  }

  const prefixChapter = previous.chapters[changedChapterIndex - 1];
  if (!prefixChapter) {
    return compose(document, rules, template, measurer, options);
  }
  const indexOffset = options?.pageIndexOffset ?? 0;
  // reusedPageCount is in page-index space (first page has index
  // `indexOffset`); the pages array is 0-based, hence the subtraction.
  const reusedPageCount = prefixChapter.startPage + chapterPageCount(previous, changedChapterIndex - 1);
  const reusedPages = previous.pages.slice(0, reusedPageCount - indexOffset);

  const { compositions } = composeChapters(slices.slice(changedChapterIndex), ctx, reusedPageCount);
  const { pages, chapterStartPages, violations } = materialize(
    compositions,
    slices.slice(changedChapterIndex),
    ctx,
    reusedPageCount,
  );

  // Reused pages keep their original page indexes (index space includes the
  // pageIndexOffset); recomposed pages were materialized with global indexes.
  const allPages = [...reusedPages, ...pages];
  // Renumber reused pages' indexes and ensure pageNumber formatting is stable.
  const allStartPages = [
    ...previous.chapters.slice(0, changedChapterIndex).map((c) => c.startPage),
    ...chapterStartPages,
  ];

  const indexes = buildGlobalIndexes(
    document,
    allPages,
    resolvedTemplate,
    resolvedRules,
    slices,
    allStartPages,
  );

  // Violations of reused pages are preserved; new ones come from recomposition.
  const preservedViolations = previous.violations.filter((v) => v.page < reusedPageCount);
  return { pages: allPages, violations: [...preservedViolations, ...violations], ...indexes };
}

function chapterPageCount(previous: ComposeResult, chapterIndex: number): number {
  const start = previous.chapters[chapterIndex]?.startPage ?? 0;
  const next = previous.chapters[chapterIndex + 1]?.startPage ?? previous.pages.length;
  return next - start;
}

/**
 * Structural diff between two compositions (C5). Powers the before/after
 * summary shown after big changes (paste, reimport): chapter page shifts,
 * TOC size delta and new violations.
 */
export interface ChapterPageShift {
  chapterId: string;
  title: string;
  fromPage: number;
  toPage: number;
}

export interface CompositionDiff {
  /** Chapters whose start page moved (1-based printed numbers). */
  chapterShifts: ChapterPageShift[];
  /** Change in generated TOC entry count (next - prev). */
  tocDelta: number;
  /** Violations present in next that were not in prev (by blockId+rule). */
  newViolations: ComposeViolation[];
  /** Total page count change (next - prev). */
  pageCountDelta: number;
}

export function diffCompositions(prev: ComposeResult, next: ComposeResult): CompositionDiff {
  const prevStart = new Map(prev.chapters.map((chapter) => [chapter.id, chapter.startPage]));
  const chapterShifts: ChapterPageShift[] = [];
  for (const chapter of next.chapters) {
    const before = prevStart.get(chapter.id);
    if (before !== undefined && before !== chapter.startPage) {
      chapterShifts.push({
        chapterId: chapter.id,
        title: chapter.title,
        fromPage: before + 1,
        toPage: chapter.startPage + 1,
      });
    }
  }

  const prevViolationKeys = new Set(
    prev.violations.map((v) => `${v.blockId}:${v.rule}`),
  );
  const newViolations = next.violations.filter(
    (v) => !prevViolationKeys.has(`${v.blockId}:${v.rule}`),
  );

  return {
    chapterShifts,
    tocDelta: next.toc.length - prev.toc.length,
    newViolations,
    pageCountDelta: next.pages.length - prev.pages.length,
  };
}
