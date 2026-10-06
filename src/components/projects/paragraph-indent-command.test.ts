import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { EditorialParagraphAttributes } from './AdvancedRichTextEditor';
import {
  FALLBACK_INDENT_STEP_PT,
  deriveIndentLevels,
  indentLevelsForEditor,
  applyParagraphIndent,
  canChangeParagraphIndent,
  computeIndentChange,
  lengthToPt,
} from './paragraph-indent-command';

function makeEditor(html: string) {
  return new Editor({ extensions: [StarterKit, EditorialParagraphAttributes], content: html });
}

function paragraphAttrs(editor: Editor, index = 0) {
  return editor.getJSON().content?.[index]?.attrs ?? {};
}

describe('paragraph indent command', () => {
  it('converts lengths to points', () => {
    expect(lengthToPt('1in')).toBe(72);
    expect(lengthToPt('24px')).toBeCloseTo(18);
    expect(lengthToPt('17.5pt')).toBe(17.5);
    expect(lengthToPt(null)).toBe(0);
  });

  it('Enter inherits firstLineIndent, leftIndent and rightIndent', () => {
    const editor = makeEditor(
      '<p style="text-indent: 18pt; margin-left: 12pt; margin-right: 6pt;">Nota editorial</p>',
    );
    editor.commands.setTextSelection(editor.state.doc.content.size - 1);
    editor.commands.splitBlock();
    const second = paragraphAttrs(editor, 1);
    expect(second.firstLineIndent).toBe('18pt');
    expect(second.leftIndent).toBe('12pt');
    expect(second.rightIndent).toBe('6pt');
    editor.destroy();
  });

  it('derives natural levels from the chapter, merging near-duplicates and keeping source values', () => {
    const levels = deriveIndentLevels([
      { firstLineIndent: '17.0064pt', leftIndent: null },
      { firstLineIndent: '17.0064pt', leftIndent: null },
      { firstLineIndent: '0pt', leftIndent: '33.984pt' },
    ]);
    expect(levels.left.slice(0, 4).map((v) => Number(v.toFixed(2)))).toEqual([0, 17.01, 33.98, 51.02]);
    expect(levels.firstLine[0]).toBe(0);
    expect(levels.firstLine[1]).toBeCloseTo(17.0064, 3);
  });

  it('falls back to a modest fixed step when the chapter has no measurements', () => {
    const levels = deriveIndentLevels([{ firstLineIndent: null, leftIndent: null }]);
    expect(levels.left.slice(0, 3)).toEqual([0, FALLBACK_INDENT_STEP_PT, FALLBACK_INDENT_STEP_PT * 2]);
  });

  it('walks contextual levels progressively: 34 -> 17 -> 0 -> 17 -> 34', () => {
    const editor = makeEditor(
      '<p style="text-indent: 17.0064pt;">Cuerpo</p><p style="text-indent: 17.0064pt;">Cuerpo 2</p>' +
        '<p style="margin-left: 33.984pt;">Cita</p>',
    );
    editor.commands.setTextSelection(editor.state.doc.content.size - 2);
    const left = () => paragraphAttrs(editor, 2).leftIndent;
    applyParagraphIndent(editor, -1);
    expect(left()).toBe('17.01pt');
    applyParagraphIndent(editor, -1);
    expect(left()).toBeNull();
    applyParagraphIndent(editor, 1);
    expect(left()).toBe('17.01pt');
    applyParagraphIndent(editor, 1);
    expect(left()).toBe('33.98pt');
    editor.destroy();
  });

  it('does not rewrite imported values of untouched paragraphs', () => {
    const editor = makeEditor(
      '<p style="text-indent: 17.0064pt;">A</p><p style="margin-left: 33.984pt;">B</p>',
    );
    editor.commands.setTextSelection(editor.state.doc.content.size - 2);
    applyParagraphIndent(editor, -1);
    expect(paragraphAttrs(editor, 0).firstLineIndent).toBe('17.0064pt');
    expect(indentLevelsForEditor(editor).left[0]).toBe(0);
    editor.destroy();
  });

  it('decrease on a first-line indented paragraph reaches the margin and then disables', () => {
    const editor = makeEditor('<p style="text-indent: 17.0064pt;">Hola</p>');
    editor.commands.setTextSelection(2);
    const enabled = () => canChangeParagraphIndent(paragraphAttrs(editor), -1, indentLevelsForEditor(editor));
    expect(enabled()).toBe(true);
    applyParagraphIndent(editor, -1);
    expect(paragraphAttrs(editor).firstLineIndent).toBe('0pt');
    expect(editor.getHTML()).toContain('text-indent: 0pt');
    expect(enabled()).toBe(false);
    editor.destroy();
  });

  it('increase from 0 uses the next natural level, and decrease inverts it', () => {
    const editor = makeEditor('<p>Hola</p>');
    editor.commands.setTextSelection(2);
    applyParagraphIndent(editor, 1);
    expect(paragraphAttrs(editor).leftIndent).toBe(`${FALLBACK_INDENT_STEP_PT}pt`);
    expect(editor.getHTML()).toContain(`margin-left: ${FALLBACK_INDENT_STEP_PT}pt`);
    applyParagraphIndent(editor, -1);
    expect(paragraphAttrs(editor).leftIndent).toBeNull();
    expect(editor.getHTML()).not.toContain('margin-left');
    editor.destroy();
  });

  it('keeps hanging indents valid (first line never leaves the writing area)', () => {
    const state = { firstLinePt: -20, leftPt: 20 };
    expect(computeIndentChange(state, -1)).toEqual(state);
    const next = computeIndentChange({ firstLinePt: -20, leftPt: 60 }, -1);
    expect(next.firstLinePt).toBe(-20);
    expect(next.leftPt).toBeGreaterThanOrEqual(20);
    expect(next.leftPt).toBeLessThan(60);
  });

  it('undo/redo restore the indent', () => {
    const editor = makeEditor('<p>Hola</p>');
    editor.commands.setTextSelection(2);
    applyParagraphIndent(editor, 1);
    editor.commands.undo();
    expect(paragraphAttrs(editor).leftIndent).toBeNull();
    editor.commands.redo();
    expect(paragraphAttrs(editor).leftIndent).toBe(`${FALLBACK_INDENT_STEP_PT}pt`);
    editor.destroy();
  });

  it('round-trips through getHTML and parse, preserving sourceStyleId', () => {
    const editor = makeEditor('<p style="text-indent: 20pt;" data-source-style-id="P10">Hola</p>');
    editor.commands.setTextSelection(2);
    applyParagraphIndent(editor, 1);
    applyParagraphIndent(editor, -1);
    applyParagraphIndent(editor, -1);
    const html = editor.getHTML();
    const reloaded = makeEditor(html);
    const attrs = paragraphAttrs(reloaded);
    expect(attrs.firstLineIndent).toBe('0pt');
    expect(attrs.leftIndent).toBeNull();
    expect(attrs.sourceStyleId).toBe('P10');
    editor.destroy();
    reloaded.destroy();
  });
});
