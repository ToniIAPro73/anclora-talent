/**
 * Typographic measurement for the composition engine.
 *
 * The engine is pure and deterministic: it never touches the DOM itself.
 * All text measurement goes through the `TextMeasurer` port. Production
 * wiring injects a canvas-based measurer in the browser (real font metrics,
 * project Google Fonts already loaded) and an equivalent server measurer
 * for export. `createHeuristicMeasurer` is the deterministic fallback used
 * by tests and SSR when no canvas is available.
 */

export interface MeasureRequest {
  text: string;
  /** Content width available for the line, in px. */
  contentWidth: number;
  fontSize: number;
  /** Relative weight of the average glyph, em fraction (e.g. headings). */
  fontStyle?: 'normal' | 'bold';
}

export interface TextMeasurer {
  /** Number of lines the text wraps into at the given width. Always >= 1 for non-empty text. */
  measureLines(request: MeasureRequest): number;
}

const AVG_CHAR_WIDTH_EM = 0.5;
const BOLD_WIDTH_FACTOR = 1.05;

/** Deterministic fallback measurer (average glyph width model). */
export function createHeuristicMeasurer(): TextMeasurer {
  return {
    measureLines({ text, contentWidth, fontSize, fontStyle }) {
      const factor = fontStyle === 'bold' ? BOLD_WIDTH_FACTOR : 1;
      const charsPerLine = Math.max(1, Math.floor(contentWidth / (fontSize * AVG_CHAR_WIDTH_EM * factor)));
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length === 0) return 1;
      let lines = 1;
      let current = 0;
      for (const word of words) {
        const length = word.length + (current > 0 ? 1 : 0);
        if (current + length <= charsPerLine) {
          current += length;
        } else {
          const wordLines = Math.max(1, Math.ceil(word.length / charsPerLine));
          lines += wordLines - (current === 0 ? 1 : 0);
          current = word.length % charsPerLine || charsPerLine;
        }
      }
      return Math.max(1, lines);
    },
  };
}

/**
 * Canvas-based measurer for the browser: real font metrics via
 * `CanvasRenderingContext2D.measureText`. Falls back to the heuristic
 * measurer when no canvas 2d context is available (SSR, tests).
 */
export function createCanvasMeasurer(fontFamily = 'DM Sans, sans-serif'): TextMeasurer {
  const fallback = createHeuristicMeasurer();
  if (typeof document === 'undefined') return fallback;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return fallback;

  return {
    measureLines({ text, contentWidth, fontSize, fontStyle }) {
      ctx.font = `${fontStyle === 'bold' ? '700' : '400'} ${fontSize}px ${fontFamily}`;
      const words = text.split(/\s+/).filter(Boolean);
      if (words.length === 0) return 1;
      const spaceWidth = ctx.measureText(' ').width;
      let lines = 1;
      let current = 0;
      for (const word of words) {
        const wordWidth = ctx.measureText(word).width;
        const needed = wordWidth + (current > 0 ? spaceWidth : 0);
        if (current + needed <= contentWidth) {
          current += needed;
        } else if (wordWidth <= contentWidth) {
          lines += 1;
          current = wordWidth;
        } else {
          // Word longer than a line: approximate split by measured chunks.
          const extra = Math.ceil(wordWidth / contentWidth);
          lines += current > 0 ? extra : extra - 1;
          current = wordWidth % contentWidth || contentWidth;
        }
      }
      return Math.max(1, lines);
    },
  };
}

/** Server-equivalent measurer for export: deterministic, no DOM required. */
export function createServerMeasurer(): TextMeasurer {
  return createHeuristicMeasurer();
}

/**
 * Greedy word wrap driven by a measurer: returns the words of each line.
 * Used by the preview/export adapter to reconstruct paragraph fragments for
 * split placements with the same measurement the engine used to paginate.
 */
export function wrapTextLines(
  text: string,
  request: Omit<MeasureRequest, 'text'>,
  measurer: TextMeasurer,
): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [''];
  const lines: string[] = [];
  let current = '';
  let currentCount = 1;
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    const candidateCount = measurer.measureLines({ ...request, text: candidate });
    if (current && candidateCount > currentCount) {
      lines.push(current);
      current = word;
      currentCount = measurer.measureLines({ ...request, text: word });
    } else {
      current = candidate;
      currentCount = candidateCount;
    }
  }
  lines.push(current);
  return lines;
}
