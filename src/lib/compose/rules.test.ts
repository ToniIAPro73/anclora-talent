import { describe, expect, it } from 'vitest';
import {
  DocumentRules,
  defaultDocumentRules,
  formatPageNumber,
  resolveDocumentRules,
} from './rules';

/**
 * Contract gate for the declarative rules (C3). The merge priority is:
 * defaults < persisted partial (a full partial wins on every leaf it
 * provides; untouched leaves fall back to the defaults). Nested groups
 * (keepTogether.list, numbering) merge leaf-by-leaf, never wholesale.
 */
describe('resolveDocumentRules — merge priority', () => {
  it('returns the defaults verbatim when the partial is missing or null', () => {
    expect(resolveDocumentRules()).toEqual(defaultDocumentRules);
    expect(resolveDocumentRules(null)).toEqual(defaultDocumentRules);
    expect(resolveDocumentRules(undefined)).toEqual(defaultDocumentRules);
  });

  it('returns a deep clone: mutating the result never touches the defaults', () => {
    const resolved = resolveDocumentRules();
    resolved.keepTogether.table = false;
    resolved.keepTogether.list.maxItems = 99;
    resolved.keepWithNext.headingLevels.push(6);
    resolved.numbering.pageNumberFormat = 'lower-roman';
    expect(defaultDocumentRules.keepTogether.table).toBe(true);
    expect(defaultDocumentRules.keepTogether.list.maxItems).toBe(5);
    expect(defaultDocumentRules.keepWithNext.headingLevels).toEqual([1, 2, 3]);
    expect(defaultDocumentRules.numbering.pageNumberFormat).toBe('decimal');
  });

  it('partial leaves override defaults while untouched leaves keep them', () => {
    const resolved = resolveDocumentRules({
      keepTogether: { ...defaultDocumentRules.keepTogether, table: false, code: false },
    });
    expect(resolved.keepTogether.table).toBe(false);
    expect(resolved.keepTogether.code).toBe(false);
    // Untouched leaves fall back to the defaults.
    expect(resolved.keepTogether.quote).toBe(defaultDocumentRules.keepTogether.quote);
    expect(resolved.keepTogether.tableFillGap).toBe(defaultDocumentRules.keepTogether.tableFillGap);
    expect(resolved.widowsOrphans).toEqual(defaultDocumentRules.widowsOrphans);
    expect(resolved.exportGate).toBe(defaultDocumentRules.exportGate);
  });

  it('merges the nested keepTogether.list group leaf-by-leaf', () => {
    const resolved = resolveDocumentRules({
      keepTogether: { ...defaultDocumentRules.keepTogether, list: { maxItems: 12 } },
    });
    expect(resolved.keepTogether.list.maxItems).toBe(12);
    // A partial list must not wipe the sibling keepTogether leaves.
    expect(resolved.keepTogether.table).toBe(true);
    expect(resolved.keepTogether.imageWithCaption).toBe(true);
  });

  it('explicit falsy overrides win over truthy defaults (never fall back)', () => {
    // pageBreakBeforeChapter defaults to true; an explicit false must stick.
    const resolved = resolveDocumentRules({
      pageBreakBeforeChapter: false,
      chapterStartsOnOddPage: true,
      exportGate: 'block',
    });
    expect(resolved.pageBreakBeforeChapter).toBe(false);
    expect(resolved.chapterStartsOnOddPage).toBe(true);
    expect(resolved.exportGate).toBe('block');
  });

  it('merges numbering rules leaf-by-leaf', () => {
    const resolved = resolveDocumentRules({
      numbering: { ...defaultDocumentRules.numbering, restartFiguresPerChapter: false },
    });
    expect(resolved.numbering.restartFiguresPerChapter).toBe(false);
    expect(resolved.numbering.restartTablesPerChapter).toBe(true);
    expect(resolved.numbering.pageNumberFormat).toBe('decimal');
  });

  it('a complete rules object passes through unchanged', () => {
    const full: DocumentRules = {
      keepTogether: {
        table: false,
        tableFillGap: 'next-float',
        list: { maxItems: 3 },
        code: false,
        quote: false,
        callout: false,
        imageWithCaption: false,
      },
      keepWithNext: { headingLevels: [1], minLinesAfter: 4 },
      widowsOrphans: { minLines: 3 },
      chapterStartsOnOddPage: true,
      pageBreakBeforeChapter: false,
      numbering: {
        restartFiguresPerChapter: false,
        restartTablesPerChapter: false,
        pageNumberFormat: 'upper-roman',
      },
      exportGate: 'off',
    };
    expect(resolveDocumentRules(full)).toEqual(full);
  });
});

describe('formatPageNumber', () => {
  it('decimal passes the number through as-is', () => {
    expect(formatPageNumber(1, 'decimal')).toBe('1');
    expect(formatPageNumber(42, 'decimal')).toBe('42');
    expect(formatPageNumber(4000, 'decimal')).toBe('4000');
  });

  it('lower-roman renders subtractive notation correctly', () => {
    const cases: Array<[number, string]> = [
      [1, 'i'],
      [4, 'iv'],
      [9, 'ix'],
      [40, 'xl'],
      [44, 'xliv'],
      [90, 'xc'],
      [400, 'cd'],
      [900, 'cm'],
      [1994, 'mcmxciv'],
      [2024, 'mmxxiv'],
      [3999, 'mmmcmxcix'],
    ];
    for (const [page, expected] of cases) {
      expect(formatPageNumber(page, 'lower-roman')).toBe(expected);
    }
  });

  it('upper-roman is the uppercased lower-roman rendering', () => {
    expect(formatPageNumber(1, 'upper-roman')).toBe('I');
    expect(formatPageNumber(44, 'upper-roman')).toBe('XLIV');
    expect(formatPageNumber(1994, 'upper-roman')).toBe('MCMXCIV');
  });

  it('falls back to decimal outside the roman range (<= 0 or > 3999)', () => {
    expect(formatPageNumber(0, 'lower-roman')).toBe('0');
    expect(formatPageNumber(-3, 'lower-roman')).toBe('-3');
    expect(formatPageNumber(4000, 'lower-roman')).toBe('4000');
    expect(formatPageNumber(0, 'upper-roman')).toBe('0');
    expect(formatPageNumber(4000, 'upper-roman')).toBe('4000');
  });
});
