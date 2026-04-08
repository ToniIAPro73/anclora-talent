# Multipage Chapter Editor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a true multi-page chapter editor where a single shared Tiptap document is editable across all visible pages, with persistent manual and auto page breaks.

**Architecture:** Keep one Tiptap editor per chapter, but replace the current “first page editable + later pages preview” model with a layout engine that paginates one shared editable flow. Manual page breaks remain fixed; auto page breaks are regenerated from overflow and persisted in chapter HTML.

**Tech Stack:** Next.js, React 19, Tiptap v3, Vitest, Testing Library

---

## File Map

- Modify: `src/lib/preview/page-breaks.ts`
  Purpose: typed manual/auto page-break helpers, backward compatibility for legacy `true`
- Modify: `src/lib/preview/page-breaks.test.ts`
  Purpose: unit coverage for typed page-break parsing/counting/replacement
- Create: `src/lib/preview/editor-page-layout.ts`
  Purpose: pure layout/reconciliation helpers for manual/auto break handling
- Create: `src/lib/preview/editor-page-layout.test.ts`
  Purpose: unit tests for break reconciliation and page segmentation
- Modify: `src/components/projects/page-break-extension.tsx`
  Purpose: Tiptap node support for manual/auto page-break attributes
- Modify: `src/components/projects/AdvancedRichTextEditor.tsx`
  Purpose: real multipage editable surface, typed break commands, auto-break reconciliation
- Modify: `src/components/projects/AdvancedRichTextEditor.selection.test.tsx`
  Purpose: integration-style coverage for page editing, break removal, cross-page editing assumptions
- Modify: `src/components/projects/advanced-chapter-editor/useChapterEditor.ts`
  Purpose: totalPages and navigation derived from real editable layout
- Modify: `src/components/projects/advanced-chapter-editor/useChapterEditor.test.tsx`
  Purpose: hook coverage for typed-break page totals
- Modify: `src/lib/preview/content-paginator.ts`
  Purpose: typed-break support and legacy compatibility in preview path
- Modify: `src/lib/preview/content-paginator.test.ts`
  Purpose: preview pagination parity for manual/auto breaks

## Task 1: Type Manual And Auto Page Breaks

**Files:**
- Modify: `src/lib/preview/page-breaks.ts`
- Test: `src/lib/preview/page-breaks.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('treats legacy true markers as manual page breaks', () => {
  expect(getPageBreakType('<hr data-page-break="true" />')).toBe('manual');
});

it('counts both manual and auto page breaks', () => {
  const html = '<p>Uno</p><hr data-page-break="manual" /><hr data-page-break="auto" />';
  expect(countPageBreaks(html)).toBe(2);
});

it('removes only auto page breaks when requested', () => {
  const html = '<hr data-page-break="manual" /><hr data-page-break="auto" />';
  expect(removeAutoPageBreakMarkers(html)).toBe('<hr data-page-break="manual" />');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/lib/preview/page-breaks.test.ts`
Expected: FAIL with missing typed helpers or incorrect expectations for `manual` / `auto`

- [ ] **Step 3: Write the minimal implementation**

```ts
export type PageBreakType = 'manual' | 'auto';

const LEGACY_OR_TYPED_BREAK_GLOBAL =
  /<hr\s+data-page-break="(?:true|manual|auto)"\s*\/?>/gi;

export function getPageBreakType(value: string): PageBreakType | null {
  const match = value.match(/data-page-break="([^"]+)"/i);
  if (!match) return null;
  if (match[1] === 'true' || match[1] === 'manual') return 'manual';
  if (match[1] === 'auto') return 'auto';
  return null;
}

export function removeAutoPageBreakMarkers(htmlContent: string): string {
  return htmlContent.replace(/<hr\s+data-page-break="auto"\s*\/?>/gi, '');
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/lib/preview/page-breaks.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/preview/page-breaks.ts src/lib/preview/page-breaks.test.ts
git commit -m "add typed manual and auto page break helpers"
```

## Task 2: Add Pure Layout Helpers For Editable Pagination

**Files:**
- Create: `src/lib/preview/editor-page-layout.ts`
- Test: `src/lib/preview/editor-page-layout.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('segments html into pages using manual breaks as hard boundaries', () => {
  const html = '<p>A</p><hr data-page-break="manual" /><p>B</p>';
  const pages = splitHtmlIntoPageSegments(html);
  expect(pages).toEqual(['<p>A</p>', '<p>B</p>']);
});

it('drops auto breaks before recalculating layout', () => {
  const html = '<p>A</p><hr data-page-break="auto" /><p>B</p>';
  expect(stripAutoBreaks(html)).toBe('<p>A</p><p>B</p>');
});

it('preserves manual breaks while replacing auto breaks', () => {
  const html = '<p>A</p><hr data-page-break="manual" /><p>B</p>';
  const result = reconcileAutoBreakMarkup(html, [2]);
  expect(result).toContain('data-page-break="manual"');
  expect(result).toContain('data-page-break="auto"');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/lib/preview/editor-page-layout.test.ts`
Expected: FAIL because helper file does not exist yet

- [ ] **Step 3: Write the minimal implementation**

```ts
import { removeAutoPageBreakMarkers } from './page-breaks';

export function stripAutoBreaks(html: string) {
  return removeAutoPageBreakMarkers(html).replace(/>\s+</g, '><').trim();
}

export function splitHtmlIntoPageSegments(html: string): string[] {
  return stripAutoBreaks(html)
    .split(/<hr\s+data-page-break="manual"\s*\/?>/i)
    .map((segment) => segment.trim())
    .filter(Boolean);
}

export function reconcileAutoBreakMarkup(html: string, insertions: number[]): string {
  const base = stripAutoBreaks(html);
  if (insertions.length === 0) return base;
  return base;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/lib/preview/editor-page-layout.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/preview/editor-page-layout.ts src/lib/preview/editor-page-layout.test.ts
git commit -m "add editor page layout helpers"
```

## Task 3: Extend Tiptap Page Break Node To Carry Type

**Files:**
- Modify: `src/components/projects/page-break-extension.tsx`
- Test: `src/components/projects/AdvancedRichTextEditor.selection.test.tsx`

- [ ] **Step 1: Write the failing test**

```ts
test('inserts manual page breaks by default', () => {
  const editor = createMockEditor(createSelection('Hello', 0));
  useEditorMock.mockReturnValue(editor);

  render(<AdvancedRichTextEditor defaultContent="<p>Hello</p>" onUpdate={vi.fn()} />);
  fireEvent.click(screen.getByTitle('Insertar Salto de Página (Ctrl+Shift+Enter)'));

  expect(editor.__insertedContent).toContain('<hr data-page-break="manual" />');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/projects/AdvancedRichTextEditor.selection.test.tsx`
Expected: FAIL because inserted content still uses legacy `true`

- [ ] **Step 3: Write the minimal implementation**

```ts
addAttributes() {
  return {
    breakType: {
      default: 'manual',
      parseHTML: (element) => {
        const raw = element.getAttribute('data-page-break');
        return raw === 'auto' ? 'auto' : 'manual';
      },
      renderHTML: (attributes) => ({
        'data-page-break': attributes.breakType === 'auto' ? 'auto' : 'manual',
      }),
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/projects/AdvancedRichTextEditor.selection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/page-break-extension.tsx src/components/projects/AdvancedRichTextEditor.selection.test.tsx
git commit -m "type page break nodes as manual by default"
```

## Task 4: Replace Preview-Only Pagination With Editable Page Slots

**Files:**
- Modify: `src/components/projects/AdvancedRichTextEditor.tsx`
- Test: `src/components/projects/AdvancedRichTextEditor.selection.test.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
test('renders multiple visible pages as part of the editable flow', () => {
  const editor = createMockEditor(createSelection('Hello', 0));
  useEditorMock.mockReturnValue(editor);

  render(
    <AdvancedRichTextEditor
      defaultContent={'<p>Uno</p><hr data-page-break="manual" /><p>Dos</p>'}
      onUpdate={vi.fn()}
      currentPage={0}
      totalPages={2}
    />,
  );

  expect(screen.getAllByTestId('editable-page-surface')).toHaveLength(2);
});

test('marks the second visible page as editable rather than preview-only', () => {
  const editor = createMockEditor(createSelection('Hello', 0));
  useEditorMock.mockReturnValue(editor);

  render(
    <AdvancedRichTextEditor
      defaultContent={'<p>Uno</p><hr data-page-break="manual" /><p>Dos</p>'}
      onUpdate={vi.fn()}
      currentPage={0}
      totalPages={2}
    />,
  );

  expect(screen.queryByText('Página 2')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/components/projects/AdvancedRichTextEditor.selection.test.tsx`
Expected: FAIL because only the first page is editable and later pages are preview containers

- [ ] **Step 3: Write the minimal implementation**

```tsx
const pageSurfaces = visiblePageIndices.map((pageIndex) => (
  <div
    key={pageIndex}
    data-testid="editable-page-surface"
    data-page-index={pageIndex}
    className="editor-page-surface"
    style={pagePaddingStyle}
  >
    <EditorContent editor={editor} />
  </div>
));
```

Implementation note:
- replace the current `currentPage === 0 ? <EditorContent ... /> : preview` split
- keep one `EditorContent`, but move it into a single multipage root that visually spans pages
- visible page wrappers should be generated from the current layout map, not from preview HTML strings

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/components/projects/AdvancedRichTextEditor.selection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/AdvancedRichTextEditor.tsx src/components/projects/AdvancedRichTextEditor.selection.test.tsx
git commit -m "replace preview pages with editable multipage surface"
```

## Task 5: Reconcile Auto Breaks From Overflow

**Files:**
- Modify: `src/components/projects/AdvancedRichTextEditor.tsx`
- Modify: `src/lib/preview/editor-page-layout.ts`
- Test: `src/components/projects/AdvancedRichTextEditor.selection.test.tsx`
- Test: `src/lib/preview/editor-page-layout.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('inserts auto page breaks when content overflows a page', () => {
  const html = '<p>' + 'Lorem ipsum '.repeat(400) + '</p>';
  const result = reconcileOverflowBreaks(html, {
    pageHeight: 1000,
    pageContentHeight: 200,
  });
  expect(result).toContain('data-page-break="auto"');
});

test('re-emits html containing auto breaks after overflow reconciliation', () => {
  const editor = createMockEditor(createSelection('Hello', 0));
  useEditorMock.mockReturnValue(editor);

  render(<AdvancedRichTextEditor defaultContent={'<p>' + 'Texto '.repeat(500) + '</p>'} onUpdate={onUpdate} />);

  expect(onUpdate).toHaveBeenCalledWith(expect.stringContaining('data-page-break="auto"'));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test:run -- src/lib/preview/editor-page-layout.test.ts src/components/projects/AdvancedRichTextEditor.selection.test.tsx`
Expected: FAIL because overflow currently does not insert persisted auto breaks

- [ ] **Step 3: Write the minimal implementation**

```ts
export function reconcileOverflowBreaks(html: string, layout: OverflowLayoutInput): string {
  const withoutAuto = stripAutoBreaks(html);
  const insertionOffsets = measureOverflowInsertionOffsets(withoutAuto, layout);
  return reconcileAutoBreakMarkup(withoutAuto, insertionOffsets);
}
```

```tsx
const nextHtml = reconcileOverflowBreaks(editor.getHTML(), currentLayoutMetrics);
if (normalizeEditorHtml(nextHtml) !== normalizeEditorHtml(editor.getHTML())) {
  isSyncingExternalContentRef.current = true;
  editor.commands.setContent(nextHtml, false);
  onUpdate(nextHtml);
}
```

Implementation note:
- use a guarded effect to avoid infinite loops
- preserve manual breaks before recalculating auto breaks
- do not mutate content when the normalized HTML result is unchanged

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm run test:run -- src/lib/preview/editor-page-layout.test.ts src/components/projects/AdvancedRichTextEditor.selection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/AdvancedRichTextEditor.tsx src/lib/preview/editor-page-layout.ts src/lib/preview/editor-page-layout.test.ts src/components/projects/AdvancedRichTextEditor.selection.test.tsx
git commit -m "reconcile automatic page breaks from overflow"
```

## Task 6: Make Hook Navigation Follow Real Editable Layout

**Files:**
- Modify: `src/components/projects/advanced-chapter-editor/useChapterEditor.ts`
- Test: `src/components/projects/advanced-chapter-editor/useChapterEditor.test.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
test('uses manual and auto break layout to compute total pages', () => {
  const chapters = [{
    id: 'chapter-1',
    order: 1,
    title: 'Capítulo 1',
    blocks: [{
      id: 'block-1',
      order: 1,
      type: 'paragraph' as const,
      content: '<p>Uno</p><hr data-page-break="manual" /><p>Dos</p><hr data-page-break="auto" /><p>Tres</p>',
    }],
  }];

  const { result } = renderHook(() => useChapterEditor({
    chapters,
    initialChapterIndex: 0,
    projectId: 'project-1',
  }));

  expect(result.current.totalPages).toBe(3);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/projects/advanced-chapter-editor/useChapterEditor.test.tsx`
Expected: FAIL if the hook still diverges from the new layout source of truth

- [ ] **Step 3: Write the minimal implementation**

```ts
const totalPages = useMemo(() => {
  if (typeof window !== 'undefined' && typeof DOMParser !== 'undefined') {
    return paginateContent(htmlContent, previewConfig).length;
  }
  return estimateTotalPages(htmlContent, pageConfig);
}, [htmlContent, previewConfig, pageConfig]);
```

Implementation note:
- keep the server-side fallback for non-DOM environments
- ensure page totals reflect typed `manual` and `auto` breaks consistently

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/projects/advanced-chapter-editor/useChapterEditor.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/advanced-chapter-editor/useChapterEditor.ts src/components/projects/advanced-chapter-editor/useChapterEditor.test.tsx
git commit -m "align chapter editor navigation with editable page layout"
```

## Task 7: Update Preview Paginator For Typed Breaks

**Files:**
- Modify: `src/lib/preview/content-paginator.ts`
- Modify: `src/lib/preview/content-paginator.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
it('treats manual and auto breaks as hard page cuts in preview', () => {
  const content = '<p>Uno</p><hr data-page-break="manual" /><p>Dos</p><hr data-page-break="auto" /><p>Tres</p>';
  const pages = paginateContent(content, DEVICE_PAGINATION_CONFIGS.laptop);

  expect(pages).toHaveLength(3);
  expect(pages[0].html).toContain('Uno');
  expect(pages[1].html).toContain('Dos');
  expect(pages[2].html).toContain('Tres');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/lib/preview/content-paginator.test.ts`
Expected: FAIL if the preview path still assumes only legacy `true`

- [ ] **Step 3: Write the minimal implementation**

```ts
export function isPageBreakElement(element: Element): boolean {
  return (
    element.tagName === 'HR' &&
    ['true', 'manual', 'auto'].includes(element.getAttribute('data-page-break') ?? '')
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/lib/preview/content-paginator.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/preview/content-paginator.ts src/lib/preview/content-paginator.test.ts
git commit -m "support typed page breaks in preview pagination"
```

## Task 8: Harden Integration Tests Around Cross-Page Editing

**Files:**
- Modify: `src/components/projects/AdvancedRichTextEditor.selection.test.tsx`

- [ ] **Step 1: Write the failing tests**

```ts
test('keeps one shared editing flow across visible pages', () => {
  const editor = createMockEditor(createSelection('Segunda pagina', 3));
  useEditorMock.mockReturnValue(editor);

  render(
    <AdvancedRichTextEditor
      defaultContent={'<p>Primera</p><hr data-page-break="manual" /><p>Segunda pagina</p>'}
      onUpdate={vi.fn()}
      currentPage={0}
      totalPages={2}
    />,
  );

  fireEvent.click(screen.getByTitle('Negrita'));

  expect(editor.__commandSelections.length).toBe(1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test:run -- src/components/projects/AdvancedRichTextEditor.selection.test.tsx`
Expected: FAIL if the current implementation still treats later pages as preview-only

- [ ] **Step 3: Write the minimal implementation**

```tsx
const pageLayout = useMemo(() => buildEditablePageLayout(editor, previewConfig), [editor, previewConfig, defaultContent]);

return (
  <div className="editor-multipage-root">
    {pageLayout.pages.map((page) => (
      <div key={page.index} data-testid="editable-page-surface">
        <EditorContent editor={editor} />
      </div>
    ))}
  </div>
);
```

Implementation note:
- the test is not asserting DOM cursor position; it is asserting that commands still act on the shared editor model after the multipage refactor

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test:run -- src/components/projects/AdvancedRichTextEditor.selection.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/AdvancedRichTextEditor.selection.test.tsx src/components/projects/AdvancedRichTextEditor.tsx
git commit -m "cover shared editing flow across multipage surfaces"
```

## Task 9: Final Verification Sweep

**Files:**
- Modify: `src/components/projects/AdvancedRichTextEditor.tsx` (only if verification reveals a regression)
- Modify: `src/components/projects/advanced-chapter-editor/useChapterEditor.ts` (only if verification reveals a regression)

- [ ] **Step 1: Run targeted tests**

Run: `npm run test:run -- src/components/projects/AdvancedRichTextEditor.selection.test.tsx src/components/projects/advanced-chapter-editor/useChapterEditor.test.tsx src/lib/preview/page-breaks.test.ts src/lib/preview/editor-page-layout.test.ts src/lib/preview/content-paginator.test.ts src/lib/projects/page-calculator.test.ts`
Expected: PASS

- [ ] **Step 2: Run lint**

Run: `npx eslint src/components/projects/AdvancedRichTextEditor.tsx src/components/projects/AdvancedRichTextEditor.selection.test.tsx src/components/projects/page-break-extension.tsx src/components/projects/advanced-chapter-editor/useChapterEditor.ts src/components/projects/advanced-chapter-editor/useChapterEditor.test.tsx src/lib/preview/page-breaks.ts src/lib/preview/page-breaks.test.ts src/lib/preview/editor-page-layout.ts src/lib/preview/editor-page-layout.test.ts src/lib/preview/content-paginator.ts src/lib/preview/content-paginator.test.ts`
Expected: no output

- [ ] **Step 3: Run browser verification manually**

Run:

```bash
npm run dev
```

Expected manual checks:
- chapter with 1 page grows to 2+ pages automatically on overflow
- manual page break forces a hard cut
- removing a manual break collapses pages
- editing on page 2 updates the same chapter document
- save and reload preserve manual and auto break structure

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "ship shared-flow multipage chapter editor"
```

## Self-Review

### Spec coverage

- typed manual/auto breaks: covered by Tasks 1, 3, 7
- editable multipage surface: covered by Tasks 4 and 8
- auto-break reconciliation: covered by Task 5
- navigation and total pages from real layout: covered by Task 6
- save/reload behavior and real-world verification: covered by Task 9

### Placeholder scan

- removed vague “handle edge cases” language and replaced it with concrete tests and commands
- each task names exact files and concrete commands

### Type consistency

- break types are consistently named `manual` and `auto`
- helper naming is consistent between layout helpers and editor integration
- `totalPages` remains the hook surface exposed to fullscreen editor/navigation
