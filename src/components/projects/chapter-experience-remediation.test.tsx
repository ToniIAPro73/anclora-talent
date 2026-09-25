import React from 'react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ChapterRepresentativePreview } from './ChapterRepresentativePreview';
import { ChapterOrganizer } from './ChapterOrganizer';
import type { DocumentChapter } from '@/lib/projects/types';

vi.mock('@/lib/projects/actions', () => ({
  deleteChapterAction: vi.fn(),
  moveChapterAction: vi.fn(),
}));

const root = process.cwd();

describe('ANCLORA TALENT — CHAPTER EXPERIENCE REMEDIATION', () => {
  const advancedEditorCode = readFileSync(
    resolve(root, 'src/components/projects/AdvancedRichTextEditor.tsx'),
    'utf8'
  );
  const globalsCss = readFileSync(
    resolve(root, 'src/app/globals.css'),
    'utf8'
  );
  const chapterOrganizerCode = readFileSync(
    resolve(root, 'src/components/projects/ChapterOrganizer.tsx'),
    'utf8'
  );

  describe('Objective A: Representative Chapter Preview', () => {
    const mockProseChapter: DocumentChapter = {
      id: 'chap-1',
      order: 1,
      title: 'La forma de mirar',
      blocks: [
        {
          id: 'b-title',
          order: 1,
          type: 'heading',
          content: '<h1>La forma de mirar</h1>',
        },
        {
          id: 'b-p1',
          order: 2,
          type: 'paragraph',
          content: '<p>Mirar no es un acto inocente. Es una forma de estar en el mundo.</p>',
        },
        {
          id: 'b-p2',
          order: 3,
          type: 'paragraph',
          content: '<p>Este libro nace de una pregunta sencilla: ¿qué ocurre cuando miramos de verdad?</p>',
        },
        {
          id: 'b-p3',
          order: 4,
          type: 'paragraph',
          content: '<p>Quizá la forma de mirar sea también una forma de habitar.</p>',
        },
        {
          id: 'b-p4',
          order: 5,
          type: 'paragraph',
          content: '<p>Este cuarto párrafo debe quedar fuera del presupuesto de previsualización acotada.</p>',
        },
      ],
    };

    const mockTocChapter: DocumentChapter = {
      id: 'chap-toc',
      order: 0,
      title: 'Índice',
      blocks: [
        {
          id: 'toc-title',
          order: 0,
          type: 'heading',
          content: '<h1>Índice</h1>',
        },
        {
          id: 'toc-1',
          order: 1,
          type: 'paragraph',
          content: '<p data-toc-entry="true" data-toc-page="7">Prólogo</p>',
        },
        {
          id: 'toc-2',
          order: 2,
          type: 'paragraph',
          content: '<p data-toc-entry="true" data-toc-page="15">Capítulo 1. La forma de mirar</p>',
        },
        {
          id: 'toc-3',
          order: 3,
          type: 'paragraph',
          content: '<p data-toc-entry="true" data-toc-page="42">Capítulo 2. Geometrías cotidianas</p>',
        },
      ],
    };

    test('filters redundant chapter title repeat and renders first meaningful prose paragraphs', () => {
      render(<ChapterRepresentativePreview chapter={mockProseChapter} maxBlocks={3} />);

      const preview = screen.getByTestId('chapter-representative-preview');
      expect(preview).toBeInTheDocument();
      // Should contain the paragraphs
      expect(screen.getByText(/Mirar no es un acto inocente/)).toBeInTheDocument();
      expect(screen.getByText(/Este libro nace de una pregunta sencilla/)).toBeInTheDocument();
      expect(screen.getByText(/Quizá la forma de mirar sea también una forma de habitar/)).toBeInTheDocument();

      // Does not show the 4th block exceeding budget
      expect(screen.queryByText(/Este cuarto párrafo debe quedar fuera/)).not.toBeInTheDocument();
    });

    test('preserves semantic TOC list entries with data-toc-entry and data-toc-page', () => {
      render(<ChapterRepresentativePreview chapter={mockTocChapter} />);

      const preview = screen.getByTestId('chapter-representative-preview');
      expect(preview.innerHTML).toContain('data-toc-entry="true"');
      expect(preview.innerHTML).toContain('data-toc-page="7"');
      expect(screen.getByText('Prólogo')).toBeInTheDocument();
      expect(screen.getByText('Capítulo 1. La forma de mirar')).toBeInTheDocument();
    });

    test('ChapterOrganizer does not duplicate body text as summary above the paper preview', () => {
      // In ChapterOrganizer, activeSubtitle is only shown if genuine subtitle exists on chapter
      expect(chapterOrganizerCode).not.toContain('activeText.slice(0, 180)');
      expect(chapterOrganizerCode).toContain('ChapterRepresentativePreview');
    });
  });

  describe('Objective B: Editor Popover System (Font, Size, Colour)', () => {
    test('Font family selector uses anchored EditorPopover and keeps search inside', () => {
      expect(advancedEditorCode).toContain('EditorPopover');
      expect(advancedEditorCode).toContain('data-testid="editor-toolbar-font-family-button"');
      expect(advancedEditorCode).toContain('data-testid="editor-toolbar-font-search-input"');
      expect(advancedEditorCode).not.toContain('absolute left-0 top-11 z-[110] w-[220px]');
    });

    test('Font size selector uses anchored EditorPopover with real editor values', () => {
      expect(advancedEditorCode).toContain('dataTestId="editor-toolbar-font-size-button"');
      expect(advancedEditorCode).toContain('data-testid={`font-size-option-${size.name}`}');
      expect(advancedEditorCode).toContain("{ name: '16', value: '16px' }");
      expect(advancedEditorCode).toContain("{ name: '24', value: '24px' }");
    });

    test('Text colour selector uses anchored EditorPopover with real color choices', () => {
      expect(advancedEditorCode).toContain('data-testid="editor-toolbar-text-color-button"');
      expect(advancedEditorCode).toContain("name: 'Por Defecto', value: 'inherit'");
      expect(advancedEditorCode).toContain("name: 'Blanco Editorial', value: '#EDF2F8'");
    });
  });

  describe('Objective C: Undo / Redo Distinct Controls and Layout', () => {
    test('Undo and Redo are distinct controls with separate click areas and no arrow icons', () => {
      expect(advancedEditorCode).toContain('dataTestId="editor-toolbar-undo-button"');
      expect(advancedEditorCode).toContain('dataTestId="editor-toolbar-redo-button"');
      expect(advancedEditorCode).not.toContain('Undo2');
      expect(advancedEditorCode).not.toContain('Redo2');
    });

    test('CSS applies flex layout and unconstrained button width to prevent text overlap', () => {
      expect(globalsCss).toContain('.chapter-editor-layout .ac-text-editor__toolbar-actions');
      expect(globalsCss).toMatch(/\.chapter-editor-layout \.ac-text-editor__toolbar-actions\s*\{\s*display:\s*flex/);
      expect(globalsCss).toContain('.chapter-editor-layout .ac-text-editor__toolbar-actions .ac-text-editor__button');
      expect(globalsCss).toMatch(/width:\s*auto/);
    });
  });

  describe('Objective D: Two-Page / Facing-Pages Mode', () => {
    test('provides single-page and double-page toolbar buttons with aria-pressed state', () => {
      expect(advancedEditorCode).toContain('dataTestId="editor-toolbar-single-page-button"');
      expect(advancedEditorCode).toContain('dataTestId="editor-toolbar-double-page-button"');
      expect(advancedEditorCode).toContain("ariaPressed={viewMode === 'single'}");
      expect(advancedEditorCode).toContain("ariaPressed={viewMode === 'double'}");
    });

    test('double-page mode generates two distinct facing page surfaces', () => {
      expect(advancedEditorCode).toContain("const showSecondPage = layoutViewMode === 'double';");
      expect(advancedEditorCode).toContain('visiblePageIndices = Array.from');
      expect(advancedEditorCode).toContain('effectivePages = Math.max');
    });

    test('multipage-editor-flow has transparent background to preserve distinct facing page frames and gutter', () => {
      expect(globalsCss).toContain('.chapter-editor-layout .multipage-editor-flow { background: transparent');
      expect(advancedEditorCode).toContain('.multipage-editor-flow {');
      expect(advancedEditorCode).toContain('background: transparent;');
    });

    test('content scroll allows horizontal scrolling for spread viewports exceeding width', () => {
      expect(globalsCss).toMatch(/\.ac-text-editor__content--scroll\s*\{\s*overflow-x:\s*auto;/);
    });
  });
});
