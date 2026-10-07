/**
 * ODT files converted from a PDF are not flowing text: every page is a paragraph that only carries a page break,
 * with one absolutely positioned `draw:frame` text box per visual LINE inside it (plus a full-page SVG of the page art).
 * Read as ordinary text that produces a single glued block per page (no separators between lines, the carrier's
 * `line-height:1pt` applied to everything), which renders as lines drawn on top of each other.
 *
 * This module rebuilds the reading flow from the frame geometry: lines on the same baseline are merged, consecutive
 * lines become one paragraph unless the vertical gap, the font size or the weight says otherwise, large type becomes a
 * heading, letter-spaced kickers ("G U Í A") collapse to words and page numbers are dropped. It is pure (no XML), so it
 * can be tested without a document.
 */

export interface LayoutLine {
  /** Page the frame is anchored to (1-based). */
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  fontSizePt?: number;
  bold?: boolean;
  italic?: boolean;
  /** True when the line was typeset with letter-spacing ("C A P Í T U L O"): a kicker, not a sentence. */
  letterSpaced?: boolean;
}

export type LayoutBlock =
  | { kind: 'heading'; level: 1 | 2 | 3; text: string; fontSizePt?: number; bold?: boolean; italic?: boolean; page: number; first: boolean }
  | { kind: 'paragraph'; kicker?: boolean; text: string; fontSizePt?: number; bold?: boolean; italic?: boolean; page: number; first: boolean };

/** Frames whose baselines differ by less than this share of their type size are one line (an emphasised word has its own frame). */
const SAME_LINE_TOLERANCE_EM = 0.4;
const PAGE_NUMBER = /^[\s—–-]*\d{1,4}[\s—–-]*$/;

/** "G U Í A   P R Á C T I C A" -> "GUÍA PRÁCTICA": single characters separated by single spaces, words by 2+ spaces. */
export function collapseLetterSpacing(text: string): string {
  const parts = text.trim().split(/ {2,}/);
  const spaced = parts.map((part) => /^\S( \S)+$/.test(part) || /^\S$/.test(part));
  const hasRealSpacedWord = parts.some((part) => /^\S( \S){2,}$/.test(part));
  if (!hasRealSpacedWord || !spaced.every(Boolean)) return text;
  return parts.map((part) => part.replace(/ /g, '')).join(' ');
}

/** Joins two lines of one paragraph, undoing a line-end hyphenation of a lower-case continuation ("evi-" + "dente"). */
function joinLines(previous: string, next: string): string {
  if (/[a-záéíóúüñ]-$/.test(previous) && /^[a-záéíóúüñ]/.test(next)) return previous.slice(0, -1) + next;
  return `${previous} ${next}`;
}

function median(values: number[]): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Frames on the same baseline become one line, ordered left to right (clusters first, THEN x order). */
function mergeSameBaseline(lines: LayoutLine[]): LayoutLine[] {
  // Frames of different type sizes on one baseline have different tops: compare the bottom edge instead.
  const baseline = (line: LayoutLine) => line.y + (line.height || 0);
  const tolerance = (line: LayoutLine) => Math.max(2, (line.fontSizePt ?? 10) * SAME_LINE_TOLERANCE_EM);
  const ordered = [...lines].sort((a, b) => baseline(a) - baseline(b) || a.x - b.x);
  const clusters: LayoutLine[][] = [];
  for (const line of ordered) {
    const cluster = clusters.at(-1);
    if (cluster && Math.abs(baseline(cluster[0]) - baseline(line)) <= tolerance(line)) cluster.push(line);
    else clusters.push([line]);
  }
  return clusters.map((cluster) => {
    const byX = [...cluster].sort((a, b) => a.x - b.x);
    const largest = byX.reduce((best, line) => ((line.fontSizePt ?? 0) > (best.fontSizePt ?? 0) ? line : best), byX[0]);
    const left = byX[0];
    return {
      ...largest,
      x: left.x,
      width: Math.max(...byX.map((line) => line.x + line.width)) - left.x,
      text: byX.map((line) => line.text).join(' '),
      bold: byX.every((line) => line.bold),
      italic: byX.every((line) => line.italic),
      letterSpaced: byX.every((line) => line.letterSpaced),
    };
  });
}

export function reconstructLayoutFlow(input: LayoutLine[]): LayoutBlock[] {
  // Collapse letter-spacing BEFORE normalising spaces: the 3-space gaps are what separate the words.
  const lines = input
    .map((line) => {
      const raw = line.text.replace(/\t+/g, ' ').trim();
      const collapsed = collapseLetterSpacing(raw);
      return { ...line, text: collapsed.replace(/ {2,}/g, ' ').trim(), letterSpaced: collapsed !== raw };
    })
    .filter((line) => line.text);
  const pages = [...new Set(lines.map((line) => line.page))].sort((a, b) => a - b);

  // Body type: the font size that carries most of the characters.
  const weightBySize = new Map<number, number>();
  for (const line of lines) {
    if (line.fontSizePt) weightBySize.set(line.fontSizePt, (weightBySize.get(line.fontSizePt) ?? 0) + line.text.length);
  }
  const bodySize = [...weightBySize.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];

  // Body line pitch (distance between consecutive baselines of one paragraph).
  const pitches: number[] = [];
  for (const page of pages) {
    const pageLines = mergeSameBaseline(lines.filter((line) => line.page === page && PAGE_NUMBER.test(line.text) === false));
    for (let index = 1; index < pageLines.length; index += 1) {
      const gap = pageLines[index].y - pageLines[index - 1].y;
      const size = pageLines[index].fontSizePt ?? bodySize ?? 12;
      if (gap > 0 && gap < size * 2.2 && (!bodySize || pageLines[index].fontSizePt === bodySize)) pitches.push(gap);
    }
  }
  const bodyPitch = median(pitches) ?? (bodySize ? bodySize * 1.4 : 16);

  // Only a title-sized line (the cover title) is a level-1 heading; chapter titles are level 2, so the chapter
  // splitter sees ONE title and many chapters. Small display type is left to the sub-heading rule below.
  const headingLevel = (size: number | undefined, onFirstPage: boolean): 1 | 2 | 3 | null => {
    if (!size || !bodySize) return null;
    if (size >= bodySize * 2.5) return 1;
    if (onFirstPage) return null; // the author line, the strapline… of the cover are not chapters
    if (size >= bodySize * 1.4) return 2;
    if (size >= bodySize * 1.2) return 3;
    return null;
  };

  const blocks: LayoutBlock[] = [];
  for (const page of pages) {
    const pageLines = mergeSameBaseline(lines.filter((line) => line.page === page));
    let current: { block: LayoutBlock; lastY: number } | null = null;
    let firstOnPage = true;
    const flush = () => {
      if (current) blocks.push(current.block);
      current = null;
    };
    for (let index = 0; index < pageLines.length; index += 1) {
      const line = pageLines[index];
      if (PAGE_NUMBER.test(line.text)) continue; // running page number
      const sized = headingLevel(line.fontSizePt, page === pages[0]);
      // "C A P Í T U L O  U N O": a small letter-spaced line is a kicker that introduces the heading that follows.
      const isKicker = !sized && Boolean(line.letterSpaced) && line.text.length <= 40;
      // A short, bold, sentence-case line alone on its row is a sub-heading ("El precio invisible").
      const next = pageLines[index + 1];
      const isBoldSubheading =
        !sized && !isKicker && page !== pages[0] && Boolean(line.bold) && line.text.length <= 60 && /^[A-ZÁÉÍÓÚÜÑ]/.test(line.text) && !/[.,;:?]$/.test(line.text) &&
        (!next || next.y - line.y > bodyPitch * 0.7);
      const level = sized ?? (isBoldSubheading ? 3 : null);
      const isHeading = level !== null && line.text.length <= 140;
      const gap = current ? line.y - current.lastY : Infinity;
      const kind = isHeading ? 'heading' : 'paragraph';
      // The second line of a bold sub-heading that wrapped ("…optimizar a" / "solas").
      const continuesBoldHeading =
        current !== null && current.block.kind === 'heading' && current.block.level === 3 && Boolean(current.block.bold) && Boolean(line.bold) && !sized && !isKicker && gap <= bodyPitch * 1.45;
      const sameStyle =
        continuesBoldHeading ||
        current &&
        current.block.kind === kind &&
        (isHeading
          ? current.block.kind === 'heading' && current.block.level === level // a two-line title keeps one heading, whatever the emphasis
          : !isKicker && current.block.kind === 'paragraph' && !current.block.kicker && current.block.fontSizePt === line.fontSizePt && Boolean(current.block.bold) === Boolean(line.bold));
      const closeEnough = isHeading ? gap <= (line.fontSizePt ?? 12) * 1.8 : gap <= bodyPitch * 1.45;
      if (current && sameStyle && (closeEnough || continuesBoldHeading)) {
        current.block.text = joinLines(current.block.text, line.text);
        current.lastY = line.y;
        continue;
      }
      flush();
      const base = { text: line.text, fontSizePt: line.fontSizePt, bold: line.bold, italic: line.italic, page, first: firstOnPage };
      firstOnPage = false;
      current = {
        block: isHeading ? { kind: 'heading', level: level as 1 | 2 | 3, ...base } : { kind: 'paragraph', ...(isKicker ? { kicker: true } : {}), ...base },
        lastY: line.y,
      };
    }
    flush();
  }
  return blocks;
}
