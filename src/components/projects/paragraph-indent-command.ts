import type { Editor } from '@tiptap/core';

/** One indent step: 0.5in, the Word default tab stop. */
export const INDENT_STEP_PT = 36;

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

/**
 * Pure indent rule shared by the toolbar, Tab and the toolbar disabled state.
 *
 * - Increase moves the whole paragraph right (leftIndent).
 * - Decrease first pulls the left margin back; once at the margin it removes
 *   first-line indent, so a book-style paragraph can reach the left edge.
 * - Hanging paragraphs (negative first line) keep leftIndent >= -firstLine so
 *   the first line never leaves the writing area.
 */
export function computeIndentChange(
  state: ParagraphIndentState,
  delta: 1 | -1,
): ParagraphIndentState {
  const { firstLinePt, leftPt } = state;
  const minLeft = Math.max(0, -firstLinePt);
  if (delta > 0) return { firstLinePt, leftPt: leftPt + INDENT_STEP_PT };
  if (leftPt > minLeft) {
    return { firstLinePt, leftPt: Math.max(minLeft, leftPt - INDENT_STEP_PT) };
  }
  if (firstLinePt > 0) {
    return { firstLinePt: Math.max(0, firstLinePt - INDENT_STEP_PT), leftPt };
  }
  return state;
}

type NodeAttrs = Record<string, unknown>;

function stateFromAttrs(attrs: NodeAttrs): ParagraphIndentState {
  const legacyPt = Number(attrs.indent ?? 0) * 24;
  return {
    firstLinePt: lengthToPt(attrs.firstLineIndent),
    leftPt: lengthToPt(attrs.leftIndent) + legacyPt,
  };
}

export function canChangeParagraphIndent(attrs: NodeAttrs, delta: 1 | -1): boolean {
  if (delta > 0) return true;
  const current = stateFromAttrs(attrs);
  const next = computeIndentChange(current, delta);
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
  const next = computeIndentChange(stateFromAttrs(attrs), delta);

  if (blockType === 'heading') {
    // Headings never receive body first-line/left indents; keep the legacy step.
    const current = Number(attrs.indent ?? 0);
    const nextIndent = Math.max(0, Math.min(6, current + delta));
    return editor.chain().focus().updateAttributes('heading', { indent: nextIndent }).run();
  }

  return editor.chain().focus().updateAttributes('paragraph', patchFromState(attrs, next)).run();
}
