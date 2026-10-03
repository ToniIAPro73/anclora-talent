import React from 'react';
import { describe, expect, test, vi } from 'vitest';
import { render } from '@testing-library/react';
import { AdvancedRichTextEditor } from './AdvancedRichTextEditor';

// Mock dependencies
vi.mock('@/hooks/use-editor-preferences', () => ({
  useEditorPreferences: () => ({
    preferences: {
      fontSize: '16px',
      lineHeight: 1.55,
      device: 'desktop',
      margins: { top: 24, bottom: 24, left: 24, right: 24 },
    },
    isLoaded: true,
    setPreferences: vi.fn(),
    resetPreferences: vi.fn(),
  }),
}));

vi.mock('@/lib/projects/page-calculator', () => ({
  calculateWordsPerPage: vi.fn(() => 250),
  MARGIN_PRESETS: {
    normal: { top: 2.5, bottom: 2.5, left: 3, right: 3 },
  },
}));

vi.mock('@tiptap/react', async () => {
  const actual = await vi.importActual<typeof import('@tiptap/react')>('@tiptap/react');
  return {
    ...actual,
    EditorContent: ({ editor }: { editor: unknown }) =>
      editor ? (
        <div
          data-testid="advanced-tiptap-content"
          className="ProseMirror tiptap-mock-content"
          contentEditable="true"
        >
          <h1>Nota editorial</h1>
          <p>Este manuscrito original ha sido creado como documento de prueba para flujos editoriales.</p>
          <p>La maquetación está diseñada deliberadamente con elementos variados.</p>
          <p data-source-style-id="Block_20_Quote">
            <em>“Una herramienta editorial fiable no debería decidir cómo era el libro: debería ser capaz de leerlo primero.”</em>
            <br />
            <strong><em>— Nota de diseño del corpus</em></strong>
          </p>
          <table>
            <thead><tr><th>Col 1</th><th>Col 2</th></tr></thead>
            <tbody><tr><td>A</td><td>B</td></tr></tbody>
          </table>
        </div>
      ) : null,
  };
});

/**
 * ORACLE 1 (Section 31): Detects any duplicated text editing layers,
 * transparent overlays, opacity-0 full-document containers, or duplicate static projections.
 */
export function assertNoDuplicatedTextEditingLayers(container: HTMLElement) {
  // 1. Must NOT have any canonical editor page projection
  const canonicalProjections = container.querySelectorAll('[data-testid="canonical-editor-page-projection"]');
  expect(canonicalProjections).toHaveLength(0);

  // 2. Must NOT have any live-edit-surface transparent overlay
  const liveEditSurfaces = container.querySelectorAll('[data-editor-node="live-edit-surface"], .canonical-editor-live-edit-surface');
  expect(liveEditSurfaces).toHaveLength(0);

  // 3. Must NOT have any opacity-0 full-document text layers
  const transparentLayers = container.querySelectorAll('.opacity-0.pointer-events-auto, [style*="color: transparent"], [style*="-webkit-text-fill-color: transparent"]');
  expect(transparentLayers).toHaveLength(0);

  // 4. Must NOT have multiple elements rendering the chapter title
  const titleHeadings = container.querySelectorAll('h1');
  expect(titleHeadings).toHaveLength(1);

  // 5. Must NOT have duplicate text nodes across separate overlapping renderers
  const quoteParagraphs = Array.from(container.querySelectorAll('p')).filter((p) =>
    p.textContent?.includes('Una herramienta editorial fiable'),
  );
  expect(quoteParagraphs).toHaveLength(1);
}

/**
 * ORACLE 2 (Section 32): Verifies single visible editable surface.
 */
export function assertSingleVisibleEditableSurface(container: HTMLElement) {
  // 1. One single editable document
  const editableNodes = container.querySelectorAll('[contenteditable="true"]');
  expect(editableNodes).toHaveLength(1);

  // 2. The editable node is inside the visible multipage flow
  const editable = editableNodes[0];
  const flowContainer = editable.closest('.multipage-editor-flow');
  expect(flowContainer).not.toBeNull();
  expect(flowContainer).toHaveAttribute('data-editor-surface', 'single-visible');
  expect(flowContainer?.classList.contains('opacity-0')).toBe(false);

  // 3. Visible text belongs to the editable renderer
  const title = container.querySelector('h1');
  expect(editable.contains(title)).toBe(true);

  const quote = Array.from(container.querySelectorAll('p')).find((p) =>
    p.textContent?.includes('Una herramienta editorial fiable'),
  );
  expect(quote).toBeDefined();
  expect(editable.contains(quote!)).toBe(true);

  // 4. Attribution belongs to the same editable tree
  const attribution = Array.from(container.querySelectorAll('strong, em, p')).find((el) =>
    el.textContent?.includes('Nota de diseño del corpus'),
  );
  expect(attribution).toBeDefined();
  expect(editable.contains(attribution!)).toBe(true);

  // 5. Table belongs to the same editable tree
  const table = container.querySelector('table');
  expect(table).not.toBeNull();
  expect(editable.contains(table!)).toBe(true);
}

describe('Chapter Editor Single Visible Editable Surface Architecture', () => {
  test('passes assertNoDuplicatedTextEditingLayers and assertSingleVisibleEditableSurface', () => {
    const { container } = render(
      <AdvancedRichTextEditor
        defaultContent="<h1>Nota editorial</h1><p>Test</p>"
        onUpdate={vi.fn()}
        currentPage={0}
        totalPages={1}
        canonicalPages={[
          {
            globalPageNumber: 2,
            sectionIds: ['chapter-0'],
            footnoteIds: [],
            contentSlices: [],
            mappingStatus: 'EXACT',
            html: '<p>Should not be rendered as duplicate text</p>',
          },
        ]}
      />,
    );

    assertNoDuplicatedTextEditingLayers(container);
    assertSingleVisibleEditableSurface(container);
  });

  test('operates without dependency on valid SourcePageMap', () => {
    // When canonicalPages is undefined/empty, editor renders the identical single surface
    const { container } = render(
      <AdvancedRichTextEditor
        defaultContent="<h1>Capítulo sin mapa</h1><p>Texto directo</p>"
        onUpdate={vi.fn()}
        currentPage={0}
        totalPages={1}
      />,
    );

    assertNoDuplicatedTextEditingLayers(container);
    assertSingleVisibleEditableSurface(container);
  });

  test('preserves source page badge on page frame without duplicating text', () => {
    const { container } = render(
      <AdvancedRichTextEditor
        defaultContent="<h1>Nota editorial</h1>"
        onUpdate={vi.fn()}
        currentPage={0}
        totalPages={1}
        canonicalPages={[
          {
            globalPageNumber: 2,
            sectionIds: ['chapter-0'],
            footnoteIds: [],
            contentSlices: [],
            mappingStatus: 'EXACT',
            html: '',
          },
        ]}
      />,
    );

    const frame = container.querySelector('[data-testid="editable-page-surface"]');
    expect(frame).not.toBeNull();
    expect(frame?.getAttribute('data-source-page')).toBe('2');

    // No text projection inside the frame
    expect(frame?.querySelector('.flow-content-root')).toBeNull();
  });
});
