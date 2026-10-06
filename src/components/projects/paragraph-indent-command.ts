import type { Editor } from '@tiptap/core';

/**
 * Fallback indent step (0.25in) used only when the chapter offers no natural
 * measurement. The previous fixed 36pt step jumped past real document levels.
 */
export const FALLBACK_INDENT_STEP_PT = 18;

const LEVEL_TOLERANCE_PT = 1;
const MAX_GRID_LEVELS = 12;

const PT_PER_UNIT: Record<string, number> = {
  pt: 1,
  px: 72 / 96,
  in: 72,
  cm: 72 / 2.54,
  mm: 72 / 25.4,
  pc: 12,
};

export function lengthToPt(value: unknown): number {
  if (value == null) return 0;
  const match = String(value).trim().match(/^(-?\d+(?:\.\d+)?)\s*([a-z]*)$/i);
  if (!match) return 0;
  const unit = match[2].toLowerCase() || 'pt';
  const factor = PT_PER_UNIT[unit];
  return factor === undefined ? 0 : Number(match[1]) * factor;
}

function formatPt(value: number): string {
  return `${Number(value.toFixed(2))}pt`;
}

export type ParagraphIndentState = {
  firstLinePt: number;
  leftPt: number;
};

export type ParagraphIndentPatch = {
  firstLineIndent: string | null;
  leftIndent: string | null;
  indent: number;
};

export type IndentLevels = {
  /** Ascending left-indent stops (always starts with 0). */
  left: number[];
  /** Ascending first-line-indent stops (always starts with 0). */
  firstLine: number[];
};

function mergeLevels(preferred: number[], grid: number[]): number[] {
  const result = [...preferred].sort((x, y) => x - y);
  for (const candidate of grid) {
    if (!result.some((level) => Math.abs(level - candidate) < LEVEL_TOLERANCE_PT)) {
      result.push(candidate);
    }
  }
  return result.sort((x, y) => x - y);
}

function unique(values: number[]): number[] {
  const out: number[] = [];
  for (const value of values.sort((x, y) => x - y)) {
    if (!out.some((existing) => Math.abs(existing - value) < LEVEL_TOLERANCE_PT)) out.push(value);
  }
  return out;
}

function mostCommon(values: number[]): number | null {
  // Count by 0.1pt bucket but return the exact source measurement.
  const counts = new Map<number, { exact: number; count: number }>();
  for (const value of values) {
    const key = Math.round(value * 10) / 10;
    const entry = counts.get(key) ?? { exact: value, count: 0 };
    entry.count += 1;
    counts.set(key, entry);
  }
  let best: number | null = null;
  let bestCount = 0;
  for (const { exact, count } of counts.values()) {
    if (count > bestCount) {
      best = exact;
      bestCount = count;
    }
  }
  return best;
}

/**
 * Derive the indent stops a chapter naturally offers.
 *
 * Preference order: (1) measurements already present in the chapter
 * (leftIndent / firstLineIndent values), (2) a grid of multiples of the body
 * first-line indent (the document's own editorial unit), (3) the fixed
 * fallback step. Source values are never rewritten; this only decides where
 * Increase/Decrease land.
 */
export function deriveIndentLevels(
  paragraphs: ReadonlyArray<NodeAttrsLike>,
): IndentLevels {
  const lefts = paragraphs.map((attrs) => lengthToPt(attrs.leftIndent)).filter((v) => v > 0);
  const firsts = paragraphs.map((attrs) => lengthToPt(attrs.firstLineIndent)).filter((v) => v > 0);

  const base = mostCommon(firsts) ?? (lefts.length ? Math.min(...lefts) : null);
  const unit = base && base >= 6 ? base : FALLBACK_INDENT_STEP_PT;
  const grid = Array.from({ length: MAX_GRID_LEVELS }, (_, i) => (i + 1) * unit);

  return {
    left: mergeLevels([0, ...unique(lefts)], grid),
    firstLine: mergeLevels([0, ...unique(firsts)], grid),
  };
}

const DEFAULT_LEVELS: IndentLevels = deriveIndentLevels([]);

function nextLevel(value: number, levels: number[], direction: 1 | -1): number {
  if (direction > 0) {
    const higher = levels.find((level) => level > value + LEVEL_TOLERANCE_PT / 2);
    return higher ?? value + (levels[1] ?? FALLBACK_INDENT_STEP_PT);
  }
  for (let i = levels.length - 1; i >= 0; i -= 1) {
    if (levels[i] < value - LEVEL_TOLERANCE_PT / 2) return levels[i];
  }
  return 0;
}

/**
 * Pure indent rule shared by the toolbar, Tab and the toolbar disabled state.
 *
 * - Increase moves the whole paragraph to the next left stop (leftIndent).
 * - Decrease first moves to the previous left stop; once at the margin it
 *   walks firstLineIndent down its own stops, so a book-style paragraph can
 *   reach the left edge progressively.
 * - Hanging paragraphs (negative first line) keep leftIndent >= -firstLine so
 *   the first line never leaves the writing area.
 */
export function computeIndentChange(
  state: ParagraphIndentState,
  delta: 1 | -1,
  levels: IndentLevels = DEFAULT_LEVELS,
): ParagraphIndentState {
  const { firstLinePt, leftPt } = state;
  const minLeft = Math.max(0, -firstLinePt);
  if (delta > 0) {
    return { firstLinePt, leftPt: nextLevel(leftPt, levels.left, 1) };
  }
  if (leftPt > minLeft + LEVEL_TOLERANCE_PT / 2) {
    return { firstLinePt, leftPt: Math.max(minLeft, nextLevel(leftPt, levels.left, -1)) };
  }
  if (firstLinePt > LEVEL_TOLERANCE_PT / 2) {
    return { firstLinePt: nextLevel(firstLinePt, levels.firstLine, -1), leftPt };
  }
  return state;
}

type NodeAttrs = Record<string, unknown>;
type NodeAttrsLike = Readonly<Record<string, unknown>>;

function stateFromAttrs(attrs: NodeAttrs): ParagraphIndentState {
  const legacyPt = Number(attrs.indent ?? 0) * 24;
  return {
    firstLinePt: lengthToPt(attrs.firstLineIndent),
    leftPt: lengthToPt(attrs.leftIndent) + legacyPt,
  };
}

export function canChangeParagraphIndent(
  attrs: NodeAttrs,
  delta: 1 | -1,
  levels: IndentLevels = DEFAULT_LEVELS,
): boolean {
  if (delta > 0) return true;
  // Level 0 always exists, so decrease is possible iff the paragraph is not
  // already at its minimum; callers on the render path may omit `levels`.
  const current = stateFromAttrs(attrs);
  const next = computeIndentChange(current, delta, levels);
  return next.firstLinePt !== current.firstLinePt || next.leftPt !== current.leftPt;
}

function patchFromState(attrs: NodeAttrs, next: ParagraphIndentState): ParagraphIndentPatch {
  const firstLineChanged = next.firstLinePt !== lengthToPt(attrs.firstLineIndent);
  return {
    // Keep the source value untouched unless the user actually moved it.
    firstLineIndent: firstLineChanged
      ? formatPt(next.firstLinePt)
      : ((attrs.firstLineIndent as string | null | undefined) ?? null),
    leftIndent: next.leftPt > 0 ? formatPt(next.leftPt) : null,
    // Legacy indent is folded into leftIndent so there is one indent system.
    indent: 0,
  };
}

// Stops seen so far per editor: once the user moves a source-indented
// paragraph, its original value must stay reachable (34 -> 17 -> 0 -> 17 -> 34).
const seenLevels = new WeakMap<object, IndentLevels>();

/** Indent stops for the chapter currently in the editor. */
export function indentLevelsForEditor(editor: Editor): IndentLevels {
  const paragraphs: NodeAttrs[] = [];
  editor.state.doc.descendants((node) => {
    if (node.type.name === 'paragraph') paragraphs.push((node.attrs ?? {}) as NodeAttrs);
    return true;
  });
  const derived = deriveIndentLevels(paragraphs);
  const previous = seenLevels.get(editor);
  const merged: IndentLevels = previous
    ? {
        left: unique([...previous.left, ...derived.left]),
        firstLine: unique([...previous.firstLine, ...derived.firstLine]),
      }
    : derived;
  seenLevels.set(editor, merged);
  return merged;
}

/**
 * Apply increase/decrease indent to the active paragraph or heading.
 * List items keep their nesting semantics (sink/lift).
 */
export function applyParagraphIndent(editor: Editor, delta: 1 | -1): boolean {
  const { $from } = editor.state.selection;
  const blockType = $from.parent.type.name;
  if (blockType === 'listItem') {
    return delta > 0
      ? editor.chain().focus().sinkListItem('listItem').run()
      : editor.chain().focus().liftListItem('listItem').run();
  }
  if (blockType !== 'paragraph' && blockType !== 'heading') return false;

  const attrs = $from.parent.attrs as NodeAttrs;
  const next = computeIndentChange(stateFromAttrs(attrs), delta, indentLevelsForEditor(editor));

  if (blockType === 'heading') {
    // Headings never receive body first-line/left indents; keep the legacy step.
    const current = Number(attrs.indent ?? 0);
    const nextIndent = Math.max(0, Math.min(6, current + delta));
    return editor.chain().focus().updateAttributes('heading', { indent: nextIndent }).run();
  }

  return editor.chain().focus().updateAttributes('paragraph', patchFromState(attrs, next)).run();
}
