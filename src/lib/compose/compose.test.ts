import { describe, expect, it } from 'vitest';
import {
  DocumentBlock,
  ParagraphBlock,
  SemanticDocument,
} from '@/lib/document/model';
import {
  ComposeTemplate,
  compose,
  composeIncremental,
} from './compose';
import { DocumentRules, defaultDocumentRules, resolveDocumentRules } from './rules';

/**
 * Regression gate for the composition engine (C8). Fixtures use a tiny
 * deterministic template: capacity of exactly 10 lines per page,
 * 20 characters per line with the heuristic measurer.
 */

const template: ComposeTemplate = {
  pageWidth: 100,
  pageHeight: 100,
  margins: { top: 0, bottom: 0, left: 0, right: 0 },
  baseFontSize: 10,
  lineHeight: 1,
};

const WORD = 'aaaaaaaaaaaaaaaaaa'; // 18 chars → one line per word at 20 chars/line

function para(id: string, lines: number): ParagraphBlock {
  return {
    type: 'paragraph',
    id,
    content: [{ type: 'text', text: Array(lines).fill(WORD).join(' ') }],
  };
}

function heading(id: string, level: 1 | 2, text: string): DocumentBlock {
  return { type: 'heading', level, id, content: [{ type: 'text', text }] };
}

function table(id: string, rows: number): DocumentBlock {
  return {
    type: 'table',
    id,
    hasHeader: false,
    rows: Array.from({ length: rows }, () => [[{ type: 'text' as const, text: 'x' }]]),
  };
}

function list(id: string, items: number): DocumentBlock {
  return {
    type: 'list',
    id,
    ordered: false,
    items: Array.from({ length: items }, () => [{ type: 'text' as const, text: WORD }]),
  };
}

function figure(id: string, caption: string, lines = 4): DocumentBlock {
  return { type: 'image', id, src: 'https://example.test/img.png', caption, estimatedLines: lines };
}

function doc(blocks: DocumentBlock[]): SemanticDocument {
  return { version: 1, metadata: { title: 'Test book' }, blocks };
}

const rules: DocumentRules = resolveDocumentRules();

function pageBlockIds(result: ReturnType<typeof compose>, pageIndex: number): string[] {
  return result.pages[pageIndex].placements.map((p) => p.blockId);
}

describe('compose — keepTogether rules', () => {
  it('never splits a table at the end of a page: it jumps whole to the next one', () => {
    const result = compose(
      doc([heading('h1', 1, 'Chapter 1'), para('p1', 2), table('t1', 6)]),
      rules,
      template,
    );
    // h1 (4) + p1 (2) = 6 lines used; table (6) does not fit in the 4 remaining.
    expect(pageBlockIds(result, 0)).toEqual(['h1', 'p1']);
    expect(pageBlockIds(result, 1)).toEqual(['t1']);
    expect(result.violations).toEqual([]);
    expect(result.tables.t1).toBe('1.1');
  });

  it('emits a violation when a table taller than a page must be split anyway', () => {
    const result = compose(
      doc([heading('h1', 1, 'Chapter 1'), table('t1', 12)]),
      rules,
      template,
    );
    expect(result.violations).toHaveLength(1);
    expect(result.violations[0]).toMatchObject({ blockId: 't1', rule: 'keepTogether.table' });
  });

  it('moves a short list (<= maxItems) whole to the next page instead of splitting it', () => {
    // h1 (4) + p1 (4) = 8 used; list of 3 items needs 3 > 2 remaining.
    const result = compose(
      doc([heading('h1', 1, 'Chapter 1'), para('p1', 4), list('l1', 3)]),
      rules,
      template,
    );
    expect(pageBlockIds(result, 0)).toEqual(['h1', 'p1']);
    expect(result.pages[1].placements).toEqual([{ blockId: 'l1' }]);
    expect(result.violations).toEqual([]);
  });

  it('splits long lists between items, never inside an item', () => {
    const many = 14; // > list.maxItems (5) → splittable
    const result = compose(doc([heading('h1', 1, 'Chapter 1'), list('l1', many)]), rules, template);
    const placements = result.pages.flatMap((p) => p.placements);
    // All placements are contiguous item ranges.
    for (const placement of placements) {
      if (placement.blockId !== 'l1') continue;
      expect(placement.fromItem).toBeDefined();
      expect(placement.toItem).toBeDefined();
    }
    const total = placements
      .filter((p) => p.blockId === 'l1')
      .reduce((acc, p) => acc + (p.toItem! - p.fromItem! + 1), 0);
    expect(total).toBe(many);
  });
});

describe('compose — keepWithNext and widows/orphans', () => {
  it('never leaves a heading as the last block of a page', () => {
    // h1 (4) + p1 (4) = 8; h2 needs 3 + 2 following lines = 5 > 2 remaining.
    const result = compose(
      doc([heading('h1', 1, 'Chapter 1'), para('p1', 4), heading('h2', 2, 'Section'), para('p2', 5)]),
      rules,
      template,
    );
    expect(pageBlockIds(result, 0)).toEqual(['h1', 'p1']);
    expect(pageBlockIds(result, 1)).toEqual(['h2', 'p2']);
  });

  it('respects widows/orphans: a paragraph moves whole if a side would have < minLines', () => {
    // h1 (4) + p1 (3) = 7; p2 has 4 lines: space 3, rest 1 < minLines (2) → moves whole.
    const result = compose(
      doc([heading('h1', 1, 'Chapter 1'), para('p1', 3), para('p2', 4)]),
      rules,
      template,
    );
    expect(pageBlockIds(result, 0)).toEqual(['h1', 'p1']);
    expect(result.pages[1].placements).toEqual([{ blockId: 'p2' }]);
  });

  it('splits a paragraph honouring minLines on both sides', () => {
    // h1 (4); p1 has 9 lines: space 6, rest 3 → both sides >= 2 → split 6/3.
    const result = compose(doc([heading('h1', 1, 'Chapter 1'), para('p1', 9)]), rules, template);
    expect(result.pages[0].placements[1]).toEqual({ blockId: 'p1', fromLine: 1, toLine: 6 });
    expect(result.pages[1].placements[0]).toEqual({ blockId: 'p1', fromLine: 7, toLine: 9 });
  });
});

describe('compose — TOC, numbering and cross references', () => {
  it('generates the TOC from the heading structure on every composition', () => {
    const result = compose(
      doc([
        heading('c1', 1, 'Chapter One'),
        para('p1', 2),
        heading('s1', 2, 'Section A'),
        para('p2', 2),
        heading('c2', 1, 'Chapter Two'),
        para('p3', 1),
      ]),
      rules,
      template,
    );
    expect(result.toc.map((e) => e.text)).toEqual(['Chapter One', 'Section A', 'Chapter Two']);
    expect(result.toc[0].pageNumber).toBe('1');
    // Chapter 2 always starts on a new page.
    const c2Page = result.pages.findIndex((p) => p.placements.some((pl) => pl.blockId === 'c2'));
    expect(result.toc[2].pageNumber).toBe(String(c2Page + 1));
  });

  it('renumbers cross references when inserted content shifts chapters', () => {
    const base = doc([
      heading('c1', 1, 'Chapter One'),
      figure('fig1', 'First figure'),
      para('p1', 2),
      heading('c2', 1, 'Chapter Two'),
      figure('fig2', 'Second figure'),
    ]);
    const continuous = resolveDocumentRules({
      numbering: { ...defaultDocumentRules.numbering, restartFiguresPerChapter: false },
    });
    const before = compose(base, continuous, template);
    expect(before.figures).toEqual({ fig1: '1', fig2: '2' });

    // Insert a new figure in chapter 1 → fig2 must be renumbered and refs updated.
    const shifted = doc([
      heading('c1', 1, 'Chapter One'),
      figure('fig1', 'First figure'),
      figure('figNew', 'Inserted figure'),
      para('p1', 2),
      heading('c2', 1, 'Chapter Two'),
      figure('fig2', 'Second figure'),
    ]);
    const after = compose(shifted, continuous, template);
    expect(after.figures).toEqual({ fig1: '1', figNew: '2', fig2: '3' });
    expect(after.refs.fig2).toBe('3');
  });

  it('updates TOC page numbers when a paragraph insertion pushes chapters forward', () => {
    const make = (extraLines: number) =>
      doc([
        heading('c1', 1, 'Chapter One'),
        para('p1', 4),
        ...(extraLines > 0 ? [para('pExtra', extraLines)] : []),
        heading('c2', 1, 'Chapter Two'),
        para('p2', 2),
        heading('c3', 1, 'Chapter Three'),
        para('p3', 2),
      ]);
    const before = compose(make(0), rules, template);
    const after = compose(make(8), rules, template); // pushes content past a page boundary

    const tocPage = (r: ReturnType<typeof compose>, text: string) =>
      Number(r.toc.find((e) => e.text === text)!.pageNumber);
    expect(tocPage(after, 'Chapter Two')).toBeGreaterThan(tocPage(before, 'Chapter Two'));
    expect(tocPage(after, 'Chapter Three')).toBeGreaterThan(tocPage(before, 'Chapter Three'));
    // Chapter numbering of refs stays stable.
    expect(after.refs.c2).toBe('2');
  });

  it('is deterministic: same input produces identical output', () => {
    const input = doc([heading('c1', 1, 'One'), para('p1', 7), table('t1', 5), figure('f1', 'Fig')]);
    expect(compose(input, rules, template)).toEqual(compose(input, rules, template));
  });
});

describe('compose — chapterStartsOnOddPage', () => {
  it('pads with a blank page so chapters start on odd page numbers', () => {
    const oddRules = resolveDocumentRules({ chapterStartsOnOddPage: true });
    const result = compose(
      doc([heading('c1', 1, 'One'), para('p1', 3), heading('c2', 1, 'Two'), para('p2', 3)]),
      oddRules,
      template,
    );
    // Chapter 1: h1 (4) + p1 (3) = 7 → 1 page. Chapter 2 would start on page 2
    // (even) → blank page inserted, chapter 2 starts on page 3.
    const c2Index = result.pages.findIndex((p) => p.placements.some((pl) => pl.blockId === 'c2'));
    expect(c2Index + 1).toBe(3);
    expect(result.pages[1].blank).toBe(true);
  });
});

describe('composeIncremental', () => {
  const base = doc([
    heading('c1', 1, 'Chapter One'),
    para('p1', 4),
    heading('c2', 1, 'Chapter Two'),
    para('p2', 4),
    table('t1', 3),
    heading('c3', 1, 'Chapter Three'),
    para('p3', 4),
  ]);

  it('reuses pages before the affected chapter', () => {
    const prev = compose(base, rules, template);
    const changed = doc([
      heading('c1', 1, 'Chapter One'),
      para('p1', 4),
      heading('c2', 1, 'Chapter Two'),
      para('p2', 9), // grew
      table('t1', 3),
      heading('c3', 1, 'Chapter Three'),
      para('p3', 4),
    ]);
    const incremental = composeIncremental(prev, changed, 'p2', rules, template);
    const c2Start = incremental.chapters.find((c) => c.id === 'c2')!.startPage;
    // Pages before chapter 2 are identical to the previous composition.
    expect(incremental.pages.slice(0, c2Start)).toEqual(prev.pages.slice(0, c2Start));
  });

  it('produces exactly the same output as a full compose', () => {
    const prev = compose(base, rules, template);
    const changed = doc([
      heading('c1', 1, 'Chapter One'),
      para('p1', 4),
      heading('c2', 1, 'Chapter Two'),
      para('p2', 9),
      table('t1', 3),
      heading('c3', 1, 'Chapter Three'),
      para('p3', 4),
    ]);
    const incremental = composeIncremental(prev, changed, 'p2', rules, template);
    const full = compose(changed, rules, template);
    expect(incremental).toEqual(full);
  });

  it('falls back to a full compose when the changed block is unknown (structural change)', () => {
    const prev = compose(base, rules, template);
    const reimported = doc([heading('c1', 1, 'Chapter One'), para('p9', 2)]);
    const result = composeIncremental(prev, reimported, 'does-not-exist', rules, template);
    expect(result).toEqual(compose(reimported, rules, template));
  });

  it('incremental equals full compose also with odd-page chapter starts', () => {
    const oddRules = resolveDocumentRules({ chapterStartsOnOddPage: true });
    const prev = compose(base, oddRules, template);
    const changed = doc([
      heading('c1', 1, 'Chapter One'),
      para('p1', 4),
      heading('c2', 1, 'Chapter Two'),
      para('p2', 12),
      table('t1', 3),
      heading('c3', 1, 'Chapter Three'),
      para('p3', 4),
    ]);
    expect(composeIncremental(prev, changed, 'p2', oddRules, template)).toEqual(
      compose(changed, oddRules, template),
    );
  });
});

describe('diffCompositions (C5)', () => {
  it('reports chapter page shifts, TOC delta and new violations', async () => {
    const { diffCompositions } = await import('./compose');
    const base = doc([
      heading('c1', 1, 'Chapter One'),
      para('p1', 4),
      heading('c2', 1, 'Chapter Two'),
      para('p2', 2),
    ]);
    const grown = doc([
      heading('c1', 1, 'Chapter One'),
      para('p1', 14), // pushes chapter 2 one page forward
      heading('c2', 1, 'Chapter Two'),
      para('p2', 2),
    ]);
    const prev = compose(base, rules, template);
    const next = compose(grown, rules, template);
    const diff = diffCompositions(prev, next);
    expect(diff.chapterShifts).toHaveLength(1);
    expect(diff.chapterShifts[0]).toMatchObject({ chapterId: 'c2' });
    expect(diff.chapterShifts[0].toPage).toBeGreaterThan(diff.chapterShifts[0].fromPage);
    expect(diff.tocDelta).toBe(0);
    expect(diff.pageCountDelta).toBeGreaterThan(0);
    expect(diff.newViolations).toEqual([]);
  });

  it('detects new violations and TOC growth', async () => {
    const { diffCompositions } = await import('./compose');
    const prev = compose(doc([heading('c1', 1, 'One'), para('p1', 2)]), rules, template);
    const next = compose(
      doc([heading('c1', 1, 'One'), para('p1', 2), heading('s1', 2, 'New section'), table('t-big', 12)]),
      rules,
      template,
    );
    const diff = diffCompositions(prev, next);
    expect(diff.tocDelta).toBe(1);
    expect(diff.newViolations).toHaveLength(1);
    expect(diff.newViolations[0].rule).toBe('keepTogether.table');
  });
});
