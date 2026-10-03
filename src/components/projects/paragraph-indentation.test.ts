import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import {
  EditorialParagraphAttributes,
  parseIndentValue,
  parseLengthStyle,
} from './AdvancedRichTextEditor';

describe('Paragraph Indentation Preservation', () => {
  describe('Helper functions', () => {
    it('parseIndentValue handles pt, in, px and bare numbers', () => {
      expect(parseIndentValue('17.0064pt')).toBe('17.0064pt');
      expect(parseIndentValue('0.2362in')).toBe('0.2362in');
      expect(parseIndentValue('24px')).toBe('24px');
      expect(parseIndentValue('18')).toBe('18pt');
      expect(parseIndentValue('18.5')).toBe('18.5pt');
      expect(parseIndentValue('-18.5')).toBe('-18.5pt');
      expect(parseIndentValue('')).toBeNull();
      expect(parseIndentValue(null)).toBeNull();
      expect(parseIndentValue('   ')).toBeNull();
    });

    it('parseLengthStyle extracts property values from inline css', () => {
      const css = 'font-size: 12pt; text-indent: 17.0064pt; color: red; margin-left: 20pt;';
      expect(parseLengthStyle(css, 'text-indent')).toBe('17.0064pt');
      expect(parseLengthStyle(css, 'margin-left')).toBe('20pt');
      expect(parseLengthStyle(css, 'margin-right')).toBeNull();
    });
  });

  describe('TipTap EditorialParagraphAttributes extension', () => {
    it('parses text-indent, leftIndent, rightIndent, and sourceStyleId from HTML', () => {
      const html =
        '<p style="text-indent: 17.0064pt; margin-left: 12pt; margin-right: 8pt;" data-source-style-id="P10">Body text</p>';

      const editor = new Editor({
        extensions: [
          StarterKit,
          EditorialParagraphAttributes,
        ],
        content: html,
      });

      const json = editor.getJSON();
      const pNode = json.content?.[0];
      expect(pNode?.type).toBe('paragraph');
      expect(pNode?.attrs?.firstLineIndent).toBe('17.0064pt');
      expect(pNode?.attrs?.leftIndent).toBe('12pt');
      expect(pNode?.attrs?.rightIndent).toBe('8pt');
      expect(pNode?.attrs?.sourceStyleId).toBe('P10');

      const serializedHtml = editor.getHTML();
      expect(serializedHtml).toContain('text-indent: 17.0064pt');
      expect(serializedHtml).toContain('margin-left: 12pt');
      expect(serializedHtml).toContain('margin-right: 8pt');
      expect(serializedHtml).toContain('data-source-style-id="P10"');
      expect(serializedHtml).toContain('data-first-line-indent="17.0064pt"');

      editor.destroy();
    });

    it('does not bleed text-indent into unindented paragraphs or headings', () => {
      const html =
        '<h2>Heading Title</h2><p style="text-indent: 0pt;">Kicker or opening</p><p>Normal unindented</p>';

      const editor = new Editor({
        extensions: [
          StarterKit,
          EditorialParagraphAttributes,
        ],
        content: html,
      });

      const json = editor.getJSON();
      const h2Node = json.content?.[0];
      const p1Node = json.content?.[1];
      const p2Node = json.content?.[2];

      expect(h2Node?.type).toBe('heading');
      expect(p1Node?.type).toBe('paragraph');
      expect(p1Node?.attrs?.firstLineIndent).toBe('0pt');
      expect(p2Node?.type).toBe('paragraph');
      expect(p2Node?.attrs?.firstLineIndent).toBeNull();

      editor.destroy();
    });

    it('parses hanging indent (negative first-line indent with left indent)', () => {
      const html =
        '<p style="text-indent: -19.8432pt; margin-left: 19.8432pt;" data-source-style-id="P32">Bibliography entry</p>';

      const editor = new Editor({
        extensions: [
          StarterKit,
          EditorialParagraphAttributes,
        ],
        content: html,
      });

      const json = editor.getJSON();
      const pNode = json.content?.[0];
      expect(pNode?.type).toBe('paragraph');
      expect(pNode?.attrs?.firstLineIndent).toBe('-19.8432pt');
      expect(pNode?.attrs?.leftIndent).toBe('19.8432pt');

      const serializedHtml = editor.getHTML();
      expect(serializedHtml).toContain('text-indent: -19.8432pt');
      expect(serializedHtml).toContain('margin-left: 19.8432pt');

      editor.destroy();
    });

    it('handles splitting paragraph with splitBlock command', () => {
      const html = '<p style="text-indent: 17.0064pt;">First sentence. Second sentence.</p>';
      const editor = new Editor({
        extensions: [StarterKit, EditorialParagraphAttributes],
        content: html,
      });

      editor.commands.setTextSelection(15);
      editor.commands.splitBlock();

      const json = editor.getJSON();
      expect(json.content?.length).toBe(2);
      expect(json.content?.[0].type).toBe('paragraph');
      expect(json.content?.[1].type).toBe('paragraph');

      const serialized = editor.getHTML();
      expect(serialized).toContain('text-indent: 17.0064pt');

      editor.destroy();
    });
  });
});
