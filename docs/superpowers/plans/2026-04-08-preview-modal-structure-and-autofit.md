# Preview Modal Structure And Autofit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the preview modal open in laptop two-page mode with auto-fit zoom, render the real book structure cleanly, and eliminate page-internal vertical scroll.

**Architecture:** Keep `buildPreviewPages()` as the single source of truth for the preview book structure, then make `PreviewModal` derive both rendering and chapter navigation from that same page model. Rework the modal scroll architecture so only the outer document viewport scrolls, while pages remain fixed surfaces that scale through an auto-fit zoom calculation until the user manually overrides zoom.

**Tech Stack:** Next.js, React 19, TypeScript, Vitest, React Testing Library, Tailwind CSS

---

## File Map

- Create: `src/components/projects/PreviewModal.test.tsx`
  Purpose: lock down modal defaults, TOC navigation, auto-fit behavior, and no internal page scroll.
- Modify: `src/components/projects/PreviewModal.tsx`
  Purpose: change modal defaults, add auto-fit zoom, unify chapter navigation with rendered pages, and remove nested page scroll behavior.
- Modify: `src/lib/preview/preview-builder.test.ts`
  Purpose: verify the preview page model preserves cover, TOC/front matter, chapter order, and back cover.
- Modify: `src/lib/preview/preview-builder.ts`
  Purpose: tighten preview page metadata only if needed so the modal can navigate chapters and TOC entries from the same rendered structure.

## Task 1: Lock Down Preview Modal Defaults And Autofit

**Files:**
- Create: `src/components/projects/PreviewModal.test.tsx`
- Modify: `src/components/projects/PreviewModal.tsx`

- [ ] **Step 1: Write the failing modal-default tests**

Create `src/components/projects/PreviewModal.test.tsx` with a focused modal test suite:

```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { PreviewModal } from './PreviewModal';
import { resolveLocaleMessages } from '@/lib/i18n/messages';
import type { ProjectRecord } from '@/lib/projects/types';

const copy = resolveLocaleMessages('es').project;

function makeProject(): ProjectRecord {
  return {
    id: 'proj-preview-modal',
    userId: 'user-1',
    workspaceId: null,
    slug: 'preview-modal',
    title: 'Nunca más en la sombra',
    status: 'draft',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    document: {
      id: 'doc-1',
      title: 'Nunca más en la sombra',
      subtitle: 'Guía práctica',
      author: 'Antonio Ballesteros Alonso',
      language: 'es',
      chapters: [
        {
          id: 'ch-1',
          order: 0,
          title: 'Índice',
          blocks: [
            {
              id: 'b-1',
              type: 'paragraph',
              order: 0,
              content: '<h2>Índice</h2><p>Introducción</p>',
            },
          ],
        },
        {
          id: 'ch-2',
          order: 1,
          title: 'Introducción',
          blocks: [
            {
              id: 'b-2',
              type: 'paragraph',
              order: 0,
              content: '<h2>Introducción</h2><p>Texto suficientemente largo para ocupar varias líneas sin scroll interno.</p>',
            },
          ],
        },
      ],
    },
    cover: {
      id: 'cover-1',
      title: 'Nunca más en la sombra',
      subtitle: 'Guía práctica',
      palette: 'obsidian',
      backgroundImageUrl: null,
      thumbnailUrl: null,
    },
    backCover: {
      id: 'back-1',
      title: 'Nunca más en la sombra',
      body: 'Texto de contraportada',
      authorBio: 'Bio del autor',
      accentColor: null,
      backgroundImageUrl: null,
      renderedImageUrl: null,
    },
    assets: [],
  };
}

describe('PreviewModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
      const element = this as HTMLElement;
      if (element.dataset.previewViewport === 'true') {
        return DOMRect.fromRect({ width: 1400, height: 900 });
      }

      return DOMRect.fromRect({ width: 320, height: 480 });
    });
  });

  test('opens in laptop spread mode with fitted zoom', async () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    expect(screen.getByTitle('Two page spread')).toHaveAttribute('data-state', 'active');
    expect(screen.getByTitle('Desktop')).toHaveAttribute('data-state', 'active');

    await waitFor(() => {
      expect(screen.getByText(/^\d+%$/)).not.toHaveTextContent('100%');
    });
  });

  test('keeps outer document scrolling and no page-internal vertical scroll', () => {
    render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

    expect(screen.getByTestId('preview-document-scroll')).toHaveClass('overflow-auto');
    expect(screen.getAllByTestId('preview-page-shell')[0]).not.toHaveClass('overflow-y-auto');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- src/components/projects/PreviewModal.test.tsx`

Expected: FAIL because the modal currently opens in single-page mode, fixed `100%` zoom, and content pages still contain `overflow-y-auto`.

- [ ] **Step 3: Write the minimal implementation for defaults and auto-fit**

Update `src/components/projects/PreviewModal.tsx`:

```tsx
const [viewMode, setViewMode] = useState<'single' | 'spread'>('spread');
const [format, setFormat] = useState<PreviewFormat>('laptop');
const [zoom, setZoom] = useState(100);
const [hasManualZoom, setHasManualZoom] = useState(false);

const viewportRef = useRef<HTMLDivElement | null>(null);

const applyAutoFitZoom = useCallback(() => {
  if (!viewportRef.current) return;

  const viewportRect = viewportRef.current.getBoundingClientRect();
  const preset = FORMAT_PRESETS[format];
  const spreadWidth =
    viewMode === 'spread'
      ? preset.viewportWidth * 2 + 24
      : preset.viewportWidth;
  const spreadHeight = preset.pagePixelHeight;

  const widthRatio = (viewportRect.width - 32) / spreadWidth;
  const heightRatio = (viewportRect.height - 32) / spreadHeight;
  const nextZoom = Math.max(50, Math.min(150, Math.floor(Math.min(widthRatio, heightRatio) * 100)));

  setZoom(nextZoom);
}, [format, viewMode]);

useEffect(() => {
  if (hasManualZoom) return;
  applyAutoFitZoom();
}, [applyAutoFitZoom, hasManualZoom]);

useEffect(() => {
  if (hasManualZoom) return;

  const handleResize = () => applyAutoFitZoom();
  window.addEventListener('resize', handleResize);
  return () => window.removeEventListener('resize', handleResize);
}, [applyAutoFitZoom, hasManualZoom]);

const handleZoomChange = (nextZoom: number) => {
  setHasManualZoom(true);
  setZoom(nextZoom);
};
```

Also change the toolbar buttons and slider to use `handleZoomChange(...)` instead of writing `setZoom(...)` directly, and add stable attributes for tests:

```tsx
<button data-state={viewMode === 'single' ? 'active' : 'inactive'} ... />
<button data-state={viewMode === 'spread' ? 'active' : 'inactive'} ... />
<button data-state={format === 'laptop' ? 'active' : 'inactive'} ... />
<div ref={viewportRef} data-preview-viewport="true" data-testid="preview-document-scroll" className="flex-1 flex items-center justify-center overflow-auto p-4">
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:run -- src/components/projects/PreviewModal.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/PreviewModal.test.tsx src/components/projects/PreviewModal.tsx
git commit -m "feat: add preview modal autofit defaults"
```

## Task 2: Remove Internal Page Scroll And Keep A Single Outer Document Scroll

**Files:**
- Modify: `src/components/projects/PreviewModal.test.tsx`
- Modify: `src/components/projects/PreviewModal.tsx`

- [ ] **Step 1: Extend the failing test for page shells**

Add a regression test to `src/components/projects/PreviewModal.test.tsx`:

```tsx
test('renders page content inside fixed shells without nested vertical scrolling', () => {
  render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

  const pageShells = screen.getAllByTestId('preview-page-shell');
  expect(pageShells.length).toBeGreaterThan(0);

  pageShells.forEach((pageShell) => {
    expect(pageShell.className).not.toContain('overflow-y-auto');
  });

  expect(screen.getByTestId('preview-document-scroll').className).toContain('overflow-auto');
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- src/components/projects/PreviewModal.test.tsx`

Expected: FAIL because the content page renderer still wraps page content in `overflow-y-auto`.

- [ ] **Step 3: Write the minimal implementation**

In `src/components/projects/PreviewModal.tsx`, remove the nested page scroller from `PageRenderer` and give the shell a stable test id:

```tsx
return (
  <div
    data-testid="preview-page-shell"
    style={pageStyle}
    className="bg-[var(--preview-paper)] rounded-[8px] shadow-[var(--shadow-strong)] border border-[var(--preview-paper-border)] overflow-hidden flex flex-col"
  >
    <div className="flex-1 min-h-0">
      <div
        className="max-w-none text-[var(--text-secondary)] ..."
        dangerouslySetInnerHTML={{ __html: page.content || '' }}
      />
    </div>
    {page.pageNumber !== undefined && (
      <div className="border-t border-[var(--border-subtle)] pt-3 text-center text-xs text-[var(--text-tertiary)]">
        p. {page.pageNumber}
      </div>
    )}
  </div>
);
```

Also ensure the preview area remains the only document scroll container:

```tsx
<main className="flex-1 flex flex-col bg-[var(--page-surface-muted)] overflow-hidden">
  <div
    ref={viewportRef}
    data-preview-viewport="true"
    data-testid="preview-document-scroll"
    className="flex-1 overflow-auto p-4"
  >
    <div className="min-h-full flex items-center justify-center">
      <div
        className="flex transition-all duration-300"
        style={{
          gap: viewMode === 'spread' ? '1.5rem' : '0',
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'center center',
        }}
      >
        ...
      </div>
    </div>
  </div>
</main>
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- src/components/projects/PreviewModal.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/PreviewModal.test.tsx src/components/projects/PreviewModal.tsx
git commit -m "fix nested scrolling in preview modal"
```

## Task 3: Unify Chapter Navigation With The Rendered Preview Page Model

**Files:**
- Modify: `src/components/projects/PreviewModal.test.tsx`
- Modify: `src/components/projects/PreviewModal.tsx`

- [ ] **Step 1: Write the failing TOC/navigation tests**

Add navigation tests to `src/components/projects/PreviewModal.test.tsx`:

```tsx
test('builds chapter navigation from real rendered content pages instead of toc-page duplicates', () => {
  render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

  const introEntry = screen.getByRole('button', { name: /introducción/i });
  fireEvent.click(introEntry);

  expect(screen.getByDisplayValue('3')).toBeInTheDocument();
});

test('navigates one page at a time even when spread mode is active', () => {
  render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

  fireEvent.click(screen.getByText('Next'));
  expect(screen.getByDisplayValue('2')).toBeInTheDocument();

  fireEvent.click(screen.getByText('Next'));
  expect(screen.getByDisplayValue('3')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- src/components/projects/PreviewModal.test.tsx`

Expected: FAIL because the current TOC entries mix TOC-page metadata with first-content-page metadata, and spread navigation still jumps by two pages.

- [ ] **Step 3: Write the minimal implementation**

Replace the current `tocEntries` derivation in `src/components/projects/PreviewModal.tsx` with chapter navigation derived only from the rendered content pages:

```tsx
const chapterEntries = useMemo(() => {
  const seenChapters = new Set<string>();

  return pages.flatMap((page, pageIndex) => {
    if (page.type !== 'content' || !page.chapterId || seenChapters.has(page.chapterId)) {
      return [];
    }

    seenChapters.add(page.chapterId);

    return [
      {
        title: page.chapterTitle || 'Capítulo sin título',
        pageIndex,
        pageNumber: page.pageNumber,
      },
    ];
  });
}, [pages]);
```

Then wire the sidebar to `chapterEntries` rather than the mixed `tocEntries`, and make page navigation always move by one page:

```tsx
const nextPage = useCallback(() => {
  goToPage(currentPage + 1);
}, [currentPage, goToPage]);

const prevPage = useCallback(() => {
  goToPage(currentPage - 1);
}, [currentPage, goToPage]);

const visiblePages = useMemo(() => {
  if (viewMode === 'single') {
    return pages[currentPage] ? [pages[currentPage]] : [];
  }

  return [pages[currentPage], pages[currentPage + 1]].filter(Boolean);
}, [pages, currentPage, viewMode]);
```

Implementation note:
- keep the TOC page rendered inside the book if `buildPreviewPages()` emits it
- use the sidebar as chapter navigation, not as a duplicate rendering of the physical TOC page

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:run -- src/components/projects/PreviewModal.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/PreviewModal.test.tsx src/components/projects/PreviewModal.tsx
git commit -m "fix preview sidebar navigation and adjacent paging"
```

## Task 4: Verify Real Book Structure In The Builder And Modal

**Files:**
- Modify: `src/lib/preview/preview-builder.test.ts`
- Modify: `src/lib/preview/preview-builder.ts`
- Modify: `src/components/projects/PreviewModal.test.tsx`

- [ ] **Step 1: Write the failing builder and modal structure tests**

Add a builder test to `src/lib/preview/preview-builder.test.ts`:

```ts
it('builds cover, toc, chapter content, and back cover in the real preview order', () => {
  const project = createMockProject({
    document: {
      ...createMockProject().document,
      chapters: [
        {
          id: 'toc-chapter',
          order: 0,
          title: 'Índice',
          blocks: [
            {
              id: 'toc-block',
              type: 'paragraph',
              order: 0,
              content: '<h2>Índice</h2><p>Introducción</p>',
            },
          ],
        },
        {
          id: 'intro-chapter',
          order: 1,
          title: 'Introducción',
          blocks: [
            {
              id: 'intro-block',
              type: 'paragraph',
              order: 0,
              content: '<h2>Introducción</h2><p>Texto</p>',
            },
          ],
        },
      ],
    },
  });

  const pages = buildPreviewPages(project, DEVICE_PAGINATION_CONFIGS.laptop);
  expect(pages[0].type).toBe('cover');
  expect(pages[1].type).toBe('toc');
  expect(pages.some((page) => page.type === 'content' && page.chapterTitle === 'Índice')).toBe(true);
  expect(pages.some((page) => page.type === 'content' && page.chapterTitle === 'Introducción')).toBe(true);
  expect(pages.at(-1)?.type).toBe('back-cover');
});
```

Also add a modal structure smoke test to `src/components/projects/PreviewModal.test.tsx`:

```tsx
test('renders cover and back cover from the built preview structure', () => {
  render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

  expect(screen.getAllByText('Nunca más en la sombra').length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run the tests to verify they fail or expose drift**

Run: `npm run test:run -- src/lib/preview/preview-builder.test.ts src/components/projects/PreviewModal.test.tsx`

Expected: either PASS on builder order or reveal mismatched metadata; if it passes already, keep the test and continue with the modal assertions

- [ ] **Step 3: Write the minimal implementation**

Only touch `src/lib/preview/preview-builder.ts` if the new tests expose metadata drift needed by the modal. The acceptable minimal change is adding explicit navigation metadata without changing the actual page order:

```ts
pages.push({
  type: 'content',
  content: page.html,
  chapterTitle: chapter.title,
  chapterId: chapter.id,
  pageNumber: globalPageNumber,
});
```

If no builder change is required, leave the builder untouched and keep this task as a verification checkpoint rather than inventing new structure.

- [ ] **Step 4: Run the full targeted verification**

Run:

```bash
npm run test:run -- src/components/projects/PreviewModal.test.tsx src/lib/preview/preview-builder.test.ts src/components/projects/PreviewCanvas.test.tsx
npx eslint src/components/projects/PreviewModal.tsx src/components/projects/PreviewModal.test.tsx src/lib/preview/preview-builder.ts src/lib/preview/preview-builder.test.ts
```

Expected:
- Vitest passes for modal, builder, and existing preview canvas coverage
- ESLint passes on all touched files

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/PreviewModal.tsx src/components/projects/PreviewModal.test.tsx src/lib/preview/preview-builder.ts src/lib/preview/preview-builder.test.ts
git commit -m "refine preview modal structure and navigation"
```

## Self-Review

- Spec coverage:
  - default laptop + two-page + auto-fit zoom: Task 1
  - no page-internal vertical scroll: Task 2
  - real structure with cover, chapters, back cover: Task 4
  - chapter list navigation from real rendered pages: Task 3
  - resize behavior while zoom is still automatic: Task 1
- Placeholder scan:
  - no `TODO`, `TBD`, or “similar to previous task” placeholders remain
  - every task includes exact file paths, code, commands, and expected outcomes
- Type consistency:
  - plan uses `PreviewPage`, `PreviewFormat`, `ProjectRecord`, and `buildPreviewPages()` names exactly as they exist in the codebase
  - plan keeps `viewMode` values as `'single' | 'spread'`, matching the current component
