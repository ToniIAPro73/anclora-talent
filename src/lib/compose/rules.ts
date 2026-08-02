/**
 * Declarative document composition rules (C3).
 *
 * A project stores one `DocumentRules` object (JSON on the project record).
 * The composition engine applies rules in a documented priority order and
 * reports a violation whenever a rule cannot be satisfied. The priority
 * table is documented in `sdd/composition-engine.md`:
 *
 *   1. explicit pageBreak block
 *   2. chapterStartsOnOddPage / pageBreakBeforeChapter
 *   3. keepWithNext (headings + minLinesAfter)
 *   4. keepTogether (table > imageWithCaption > code > quote > callout > list)
 *   5. widowsOrphans
 *
 * Lower-priority rules never override higher-priority ones. When the top
 * rule itself is impossible (e.g. a table taller than one page with
 * keepTogether.table enabled), the block is split and a violation is
 * emitted — a rule is never silently dropped.
 */

export interface KeepTogetherRules {
  table: boolean;
  /** What to do with the gap left when a table jumps to the next page. */
  tableFillGap: 'next-float' | 'leave-space';
  list: {
    /** Lists with at most this many items are never split. */
    maxItems: number;
  };
  code: boolean;
  quote: boolean;
  callout: boolean;
  imageWithCaption: boolean;
}

export interface KeepWithNextRule {
  /** Heading levels that must stay with the following content. */
  headingLevels: number[];
  /** Minimum lines of following content required after the heading. */
  minLinesAfter: number;
}

export interface WidowsOrphansRule {
  /** Minimum lines of a split paragraph on either side of the boundary. */
  minLines: number;
}

export type PageNumberFormat = 'decimal' | 'lower-roman' | 'upper-roman';

export interface NumberingRules {
  restartFiguresPerChapter: boolean;
  restartTablesPerChapter: boolean;
  pageNumberFormat: PageNumberFormat;
}

export interface DocumentRules {
  keepTogether: KeepTogetherRules;
  keepWithNext: KeepWithNextRule;
  widowsOrphans: WidowsOrphansRule;
  /** Print: chapters always start on an odd (recto) page, padding blanks. */
  chapterStartsOnOddPage: boolean;
  /** Digital: force a page break before every chapter. */
  pageBreakBeforeChapter: boolean;
  numbering: NumberingRules;
}

/** Sensible defaults, active out of the box for every project. */
export const defaultDocumentRules: DocumentRules = {
  keepTogether: {
    table: true,
    tableFillGap: 'leave-space',
    list: { maxItems: 5 },
    code: true,
    quote: true,
    callout: true,
    imageWithCaption: true,
  },
  keepWithNext: { headingLevels: [1, 2, 3], minLinesAfter: 2 },
  widowsOrphans: { minLines: 2 },
  chapterStartsOnOddPage: false,
  pageBreakBeforeChapter: true,
  numbering: {
    restartFiguresPerChapter: true,
    restartTablesPerChapter: true,
    pageNumberFormat: 'decimal',
  },
};

/** Deep-merges persisted partial rules over the defaults. */
export function resolveDocumentRules(partial?: Partial<DocumentRules> | null): DocumentRules {
  if (!partial) return structuredClone(defaultDocumentRules);
  const base = structuredClone(defaultDocumentRules);
  return {
    keepTogether: { ...base.keepTogether, ...partial.keepTogether,
      list: { ...base.keepTogether.list, ...partial.keepTogether?.list } },
    keepWithNext: { ...base.keepWithNext, ...partial.keepWithNext },
    widowsOrphans: { ...base.widowsOrphans, ...partial.widowsOrphans },
    chapterStartsOnOddPage: partial.chapterStartsOnOddPage ?? base.chapterStartsOnOddPage,
    pageBreakBeforeChapter: partial.pageBreakBeforeChapter ?? base.pageBreakBeforeChapter,
    numbering: { ...base.numbering, ...partial.numbering },
  };
}

const ROMAN_ONES = ['', 'i', 'ii', 'iii', 'iv', 'v', 'vi', 'vii', 'viii', 'ix'];
const ROMAN_TENS = ['', 'x', 'xx', 'xxx', 'xl', 'l', 'lx', 'lxx', 'lxxx', 'xc'];
const ROMAN_HUNDREDS = ['', 'c', 'cc', 'ccc', 'cd', 'd', 'dc', 'dcc', 'dccc', 'cm'];

export function formatPageNumber(page: number, format: PageNumberFormat): string {
  if (format === 'decimal') return String(page);
  if (page <= 0 || page > 3999) return String(page);
  const roman =
    ROMAN_HUNDREDS[Math.floor(page / 100) % 10] +
    ROMAN_TENS[Math.floor(page / 10) % 10] +
    ROMAN_ONES[page % 10];
  return format === 'upper-roman' ? roman.toUpperCase() : roman;
}
