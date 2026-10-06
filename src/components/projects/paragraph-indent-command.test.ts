import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { EditorialParagraphAttributes } from './AdvancedRichTextEditor';
import {
  INDENT_STEP_PT,
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

  it('decrease on a first-line indented paragraph reaches the margin and then disables', () => {
    const editor = makeEditor('<p style="text-indent: 50pt;">Hola</p>');
    editor.commands.setTextSelection(2);
    expect(canChangeParagraphIndent(paragraphAttrs(editor), -1)).toBe(true);
    expect(applyParagraphIndent(editor, -1)).toBe(true);
    expect(paragraphAttrs(editor).firstLineIndent).toBe(`${50 - INDENT_STEP_PT}pt`);
    applyParagraphIndent(editor, -1);
    expect(paragraphAttrs(editor).firstLineIndent).toBe('0pt');
    expect(editor.getHTML()).toContain('text-indent: 0pt');
    expect(canChangeParagraphIndent(paragraphAttrs(editor), -1)).toBe(false);
    editor.destroy();
  });

  it('increase updates leftIndent, renders margin-left, and decrease inverts it', () => {
    const editor = makeEditor('<p>Hola</p>');
    editor.commands.setTextSelection(2);
    applyParagraphIndent(editor, 1);
    expect(paragraphAttrs(editor).leftIndent).toBe('36pt');
    expect(editor.getHTML()).toContain('margin-left: 36pt');
    applyParagraphIndent(editor, -1);
    expect(paragraphAttrs(editor).leftIndent).toBeNull();
    expect(editor.getHTML()).not.toContain('margin-left');
    editor.destroy();
  });

  it('keeps hanging indents valid (first line never leaves the writing area)', () => {
    const state = { firstLinePt: -20, leftPt: 20 };
    expect(computeIndentChange(state, -1)).toEqual(state);
    expect(computeIndentChange({ firstLinePt: -20, leftPt: 60 }, -1)).toEqual({
      firstLinePt: -20,
      leftPt: 24,
    });
  });

  it('undo/redo restore the indent', () => {
    const editor = makeEditor('<p>Hola</p>');
    editor.commands.setTextSelection(2);
    applyParagraphIndent(editor, 1);
    editor.commands.undo();
    expect(paragraphAttrs(editor).leftIndent).toBeNull();
    editor.commands.redo();
    expect(paragraphAttrs(editor).leftIndent).toBe('36pt');
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
