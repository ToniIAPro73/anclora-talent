import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const editorSource = readFileSync(
  resolve(process.cwd(), 'src/components/projects/AdvancedRichTextEditor.tsx'),
  'utf8',
);
const previewSource = readFileSync(
  resolve(process.cwd(), 'src/components/projects/MultipageFlow.tsx'),
  'utf8',
);
const chapterEditorSource = readFileSync(
  resolve(process.cwd(), 'src/components/projects/advanced-chapter-editor/useChapterEditor.ts'),
  'utf8',
);

describe('Markdown pagination contract', () => {
  it('keeps Markdown endnotes in normal flow while reserving legacy page-footnote layout', () => {
    expect(editorSource).toContain('editorial-endnote-definition');
    expect(editorSource).toContain('isEndnotesSectionHtml(defaultContent)');
    expect(editorSource).toContain('if (isEndnotesSection) return;');
    expect(editorSource).toContain('counter-reset: talent-endnote');
    expect(editorSource).toContain("node.attrs?.editorialClass === 'editorial-footnote'");
    expect(editorSource).not.toContain("node.attrs?.editorialClass === 'editorial-endnote-definition'");
    expect(previewSource).toContain("querySelectorAll<HTMLElement>('p.editorial-footnote')");
    expect(previewSource).not.toContain("querySelectorAll<HTMLElement>('p.editorial-endnote-definition')");
    expect(editorSource).toContain('spreadStartPage + 1 < totalRenderablePages');
  });

  it('uses live occupied-column measurement as the canonical current-chapter count', () => {
    expect(chapterEditorSource).toContain('measuredTotalPages ?? estimatedTotalPages');
    expect(chapterEditorSource).not.toContain('Math.max(estimatedTotalPages, measuredTotalPages)');
  });
});
