import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const root = process.cwd();

describe('Chapter Editor Remediation & Global No-Arrow Contract', () => {
  const advancedEditorCode = readFileSync(
    resolve(root, 'src/components/projects/AdvancedRichTextEditor.tsx'),
    'utf8'
  );
  const fullscreenCode = readFileSync(
    resolve(root, 'src/components/projects/advanced-chapter-editor/ChapterEditorFullscreen.tsx'),
    'utf8'
  );
  const projectWorkspaceCode = readFileSync(
    resolve(root, 'src/components/projects/ProjectWorkspace.tsx'),
    'utf8'
  );

  describe('Objective 1: Chapter Editor List Dropdowns', () => {
    test('uses single button dropdown and no split toggle chevron button', () => {
      expect(advancedEditorCode).not.toContain('SplitToolbarButton');
      expect(advancedEditorCode).not.toContain('editor-toolbar-bullet-list-options-toggle');
      expect(advancedEditorCode).not.toContain('editor-toolbar-ordered-list-options-toggle');
      expect(advancedEditorCode).toContain('ListDropdownButton');
    });

    test('list dropdown button has fixed positioned popover with collision resistance and high z-index', () => {
      expect(advancedEditorCode).toContain('position: \'fixed\'');
      expect(advancedEditorCode).toContain('zIndex: 150');
      expect(advancedEditorCode).toContain('BULLET_STYLE_OPTIONS');
      expect(advancedEditorCode).toContain('ORDERED_STYLE_OPTIONS');
    });
  });

  describe('Objective 2: Global Rule - No Arrow Icons Inside Normal Buttons', () => {
    test('AdvancedRichTextEditor replaces undo/redo arrow icons with text buttons', () => {
      expect(advancedEditorCode).not.toContain('Undo2');
      expect(advancedEditorCode).not.toContain('Redo2');
      expect(advancedEditorCode).toContain('copy.undo');
      expect(advancedEditorCode).toContain('copy.redo');
    });

    test('ChapterEditorFullscreen removes arrows from back, chapter nav, and page nav buttons', () => {
      expect(fullscreenCode).not.toMatch(/<ArrowLeft[^>]*\/>/);
      expect(fullscreenCode).not.toMatch(/<ChevronLeft[^>]*\/>/);
      expect(fullscreenCode).not.toMatch(/<ChevronRight[^>]*\/>/);
      expect(fullscreenCode).not.toMatch(/<ArrowUp[^>]*\/>/);
      expect(fullscreenCode).not.toMatch(/<ArrowDown[^>]*\/>/);
      expect(fullscreenCode).toContain('Capítulo anterior');
      expect(fullscreenCode).toContain('Capítulo siguiente');
      expect(fullscreenCode).toContain('Pág. anterior');
      expect(fullscreenCode).toContain('Pág. siguiente');
    });

    test('design surface and previews do not use arrow icons in buttons', () => {
      const coverEditor = readFileSync(
        resolve(root, 'src/components/projects/design-surface/AdvancedCoverEditor.tsx'),
        'utf8'
      );
      const layersPanel = readFileSync(
        resolve(root, 'src/components/projects/design-surface/LayersPanel.tsx'),
        'utf8'
      );
      const imageCanvas = readFileSync(
        resolve(root, 'src/components/projects/advanced-chapter-editor/ChapterImageCanvas.tsx'),
        'utf8'
      );
      const fixedPdfPreview = readFileSync(
        resolve(root, 'src/components/projects/FixedPdfPreview.tsx'),
        'utf8'
      );
      const previewModal = readFileSync(
        resolve(root, 'src/components/projects/PreviewModal.tsx'),
        'utf8'
      );

      expect(coverEditor).not.toContain('Undo2');
      expect(coverEditor).not.toContain('Redo2');
      expect(imageCanvas).not.toContain('Undo2');
      expect(imageCanvas).not.toContain('Redo2');
      expect(layersPanel).not.toContain('ChevronUp');
      expect(layersPanel).not.toContain('ChevronDown');
      expect(fixedPdfPreview).not.toMatch(/<Chevron(Left|Right)[^>]*\/>/);
      expect(previewModal).not.toMatch(/<Chevron(Left|Right)[^>]*\/>/);
    });
  });

  describe('Objective 3: Document Typography Exposure in Chapter Editor', () => {
    test('font selector displays effective document font instead of Default label', () => {
      expect(advancedEditorCode).toContain('effectiveFontFamily');
      expect(advancedEditorCode).toContain('{effectiveFont}');
      expect(advancedEditorCode).toContain("locale === 'es' ? 'Documento' : 'Document'");
      expect(advancedEditorCode).not.toMatch(/>\s*Default\s*<\/span>/);
    });

    test('sets CSS custom property --editor-document-font for ProseMirror rendering', () => {
      expect(advancedEditorCode).toContain("'--editor-document-font'");
      const globalsCss = readFileSync(resolve(root, 'src/app/globals.css'), 'utf8');
      expect(globalsCss).toContain('var(--editor-document-font');
    });
  });

  describe('Objective 4: Document Data Synchronization', () => {
    test('ProjectWorkspace extracts composition and font family and passes to ChapterEditorFullscreen', () => {
      expect(projectWorkspaceCode).toContain('effectiveFontFamily');
      expect(projectWorkspaceCode).toContain('project.document.metadata?.composition?.fontFamily');
      expect(projectWorkspaceCode).toContain('composition={project.document.metadata?.composition ?? null}');
    });

    test('ChapterEditorFullscreen forwards composition and effectiveFontFamily to AdvancedRichTextEditor', () => {
      expect(fullscreenCode).toContain('effectiveFontFamily={effectiveFontFamily}');
      expect(fullscreenCode).toContain('composition={composition}');
    });
  });
});
