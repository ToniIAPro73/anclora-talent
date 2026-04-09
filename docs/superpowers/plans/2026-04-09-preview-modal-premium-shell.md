# Preview Modal Premium Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `PreviewModal` as a premium editorial modal shell that keeps the book as the focus, preserves `buildPreviewPages()` as the source of truth, and complies with the modal and premium-brand contracts.

**Architecture:** Keep the existing preview page pipeline and navigation model, but reorganize the modal into a shell with clear header, controls, sidebar/stage composition, and persistent footer. Use TDD to lock the premium shell contract first, then refactor `PreviewModal.tsx` around those expectations without changing preview content generation.

**Tech Stack:** Next.js App Router, React 19, TypeScript, Tailwind CSS, Vitest, React Testing Library

---

## File Map

- Modify: `src/components/projects/PreviewModal.tsx`
  Purpose: restructure the modal shell, premium framing, desktop/mobile layout, and footer/header hierarchy while preserving preview behavior.
- Modify: `src/components/projects/PreviewModal.test.tsx`
  Purpose: lock the modal premium shell contract, header/footer visibility, stage/sidebar layout, and existing source-of-truth behavior.
- Optional Modify: `src/components/projects/PreviewCanvas.tsx`
  Purpose: only if the launcher needs extra test ids or trigger wiring for visual verification.

## Task 1: Lock The Premium Modal Shell Contract

**Files:**
- Modify: `src/components/projects/PreviewModal.test.tsx`
- Modify: `src/components/projects/PreviewModal.tsx`

- [ ] **Step 1: Write the failing premium-shell tests**

Add these tests to `src/components/projects/PreviewModal.test.tsx`:

```tsx
test('renders a premium modal shell with visible header, stage, and footer regions', () => {
  render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

  expect(screen.getByTestId('preview-modal-shell')).toBeInTheDocument();
  expect(screen.getByTestId('preview-modal-header')).toBeInTheDocument();
  expect(screen.getByTestId('preview-modal-stage')).toBeInTheDocument();
  expect(screen.getByTestId('preview-modal-footer')).toBeInTheDocument();
});

test('keeps the close action visible in the premium header', () => {
  render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

  expect(screen.getByTestId('preview-modal-close')).toBeVisible();
});

test('keeps footer navigation visible while the preview body owns scrolling', () => {
  render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

  expect(screen.getByTestId('preview-modal-footer')).toBeVisible();
  expect(screen.getByTestId('preview-document-scroll')).toHaveClass('overflow-auto');
  expect(screen.getByTestId('preview-modal-shell')).toHaveClass('overflow-hidden');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- src/components/projects/PreviewModal.test.tsx`

Expected: FAIL because the shell does not yet expose explicit premium regions or stable test ids for the contract.

- [ ] **Step 3: Implement the minimal premium shell scaffolding**

Restructure `src/components/projects/PreviewModal.tsx` so the outer modal exposes stable shell regions:

```tsx
return (
  <div className="fixed inset-0 z-50 bg-[rgba(4,6,12,0.78)] backdrop-blur-md">
    <div
      data-testid="preview-modal-shell"
      className="mx-auto flex h-[100dvh] w-full max-w-[1800px] flex-col overflow-hidden border border-white/10 bg-[#111c28] shadow-[0_30px_120px_rgba(0,0,0,0.45)] md:h-[calc(100dvh-32px)] md:rounded-[28px] md:mt-4"
    >
      <header data-testid="preview-modal-header">...</header>
      <div className="flex-1 min-h-0">...</div>
      <footer data-testid="preview-modal-footer">...</footer>
    </div>
  </div>
);
```

Add explicit test ids:

```tsx
<button data-testid="preview-modal-close" ... />
<main data-testid="preview-modal-stage" ... />
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:run -- src/components/projects/PreviewModal.test.tsx`

Expected: PASS for the premium shell tests while existing tests remain green.

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/PreviewModal.tsx src/components/projects/PreviewModal.test.tsx
git commit -m "feat: add premium shell contract to preview modal"
```

## Task 2: Rebuild Header And Controls Around Premium Editorial Hierarchy

**Files:**
- Modify: `src/components/projects/PreviewModal.test.tsx`
- Modify: `src/components/projects/PreviewModal.tsx`

- [ ] **Step 1: Write the failing header/control layout tests**

Add these tests to `src/components/projects/PreviewModal.test.tsx`:

```tsx
test('groups editorial metadata in the header and keeps controls in a separate premium controls band', () => {
  render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

  expect(screen.getByTestId('preview-modal-header-title')).toHaveTextContent('Nunca más en la sombra');
  expect(screen.getByTestId('preview-modal-controls')).toBeInTheDocument();
  expect(screen.getByTestId('preview-modal-view-controls')).toBeInTheDocument();
  expect(screen.getByTestId('preview-modal-zoom-controls')).toBeInTheDocument();
});

test('does not place zoom and device controls inside the footer action area', () => {
  render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

  expect(within(screen.getByTestId('preview-modal-footer')).queryByTestId('preview-modal-zoom-controls')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- src/components/projects/PreviewModal.test.tsx`

Expected: FAIL because the current header and toolbar are not separated into the premium shell hierarchy.

- [ ] **Step 3: Implement the minimal hierarchy split**

Refactor `PreviewModal.tsx` so the header is metadata-first and controls live in a dedicated controls row:

```tsx
<header data-testid="preview-modal-header" className="border-b border-white/10 px-5 py-4 md:px-6">
  <div className="flex items-start justify-between gap-4">
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[rgba(242,227,179,0.62)]">
        {copy.previewEyebrow}
      </p>
      <h2 data-testid="preview-modal-header-title" className="mt-2 truncate text-xl font-black text-white">
        {project.document.title || 'Proyecto sin título'}
      </h2>
    </div>
    <button data-testid="preview-modal-close" ... />
  </div>
</header>

<div data-testid="preview-modal-controls" className="border-b border-white/10 px-5 py-3 md:px-6">
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div data-testid="preview-modal-view-controls">...</div>
    <div data-testid="preview-modal-zoom-controls">...</div>
  </div>
</div>
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:run -- src/components/projects/PreviewModal.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/PreviewModal.tsx src/components/projects/PreviewModal.test.tsx
git commit -m "refactor preview modal header and controls"
```

## Task 3: Recompose The Body Into Editorial Rail Plus Book Stage

**Files:**
- Modify: `src/components/projects/PreviewModal.test.tsx`
- Modify: `src/components/projects/PreviewModal.tsx`

- [ ] **Step 1: Write the failing body-composition tests**

Add these tests to `src/components/projects/PreviewModal.test.tsx`:

```tsx
test('renders the table of contents inside a dedicated editorial rail on desktop', () => {
  render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

  expect(screen.getByTestId('preview-modal-sidebar')).toBeInTheDocument();
  expect(screen.getByTestId('preview-sidebar-toc')).toBeInTheDocument();
});

test('renders the book spread inside a dedicated stage surface', () => {
  render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

  expect(screen.getByTestId('preview-modal-stage')).toContainElement(screen.getByTestId('preview-spread-frame'));
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- src/components/projects/PreviewModal.test.tsx`

Expected: FAIL because the body currently exposes generic flex regions without explicit premium rail/stage boundaries.

- [ ] **Step 3: Implement the minimal body recomposition**

Update the body structure in `PreviewModal.tsx`:

```tsx
<div className="flex flex-1 min-h-0 overflow-hidden">
  {showTableOfContents && (
    <aside
      data-testid="preview-modal-sidebar"
      className="hidden w-[280px] shrink-0 border-r border-white/10 bg-[rgba(255,255,255,0.03)] md:flex md:flex-col"
    >
      ...
    </aside>
  )}

  <main
    data-testid="preview-modal-stage"
    className="flex min-h-0 flex-1 flex-col bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0))]"
  >
    <div ref={viewportRef} data-testid="preview-document-scroll" className="flex-1 overflow-auto px-4 py-5 md:px-8 md:py-8">
      ...
    </div>
  </main>
</div>
```

Keep the stage centered and preserve existing page rendering logic.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:run -- src/components/projects/PreviewModal.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/PreviewModal.tsx src/components/projects/PreviewModal.test.tsx
git commit -m "refactor preview modal body composition"
```

## Task 4: Make The Footer Contractual And Persistent

**Files:**
- Modify: `src/components/projects/PreviewModal.test.tsx`
- Modify: `src/components/projects/PreviewModal.tsx`

- [ ] **Step 1: Write the failing footer tests**

Add these tests to `src/components/projects/PreviewModal.test.tsx`:

```tsx
test('keeps previous page, page indicator, and next page controls in a persistent footer', () => {
  render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

  const footer = screen.getByTestId('preview-modal-footer');
  expect(within(footer).getByText('Previous')).toBeInTheDocument();
  expect(within(footer).getByRole('spinbutton')).toBeInTheDocument();
  expect(within(footer).getByText('Next')).toBeInTheDocument();
});

test('keeps the footer visible even when the book stage is scrollable', () => {
  render(<PreviewModal project={makeProject()} copy={copy} onClose={() => {}} />);

  expect(screen.getByTestId('preview-modal-footer')).toHaveClass('shrink-0');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- src/components/projects/PreviewModal.test.tsx`

Expected: FAIL if the footer remains visually generic or lacks explicit contractual hooks.

- [ ] **Step 3: Implement the minimal persistent footer**

Refine the footer in `PreviewModal.tsx`:

```tsx
<footer
  data-testid="preview-modal-footer"
  className="shrink-0 border-t border-white/10 bg-[rgba(7,12,20,0.92)] px-4 py-3 md:px-6"
>
  <div className="flex flex-wrap items-center justify-between gap-3">
    <div className="flex items-center gap-2">...</div>
    <div className="flex items-center gap-2">...</div>
  </div>
</footer>
```

Keep previous/next/page number logic unchanged.

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:run -- src/components/projects/PreviewModal.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/PreviewModal.tsx src/components/projects/PreviewModal.test.tsx
git commit -m "refine preview modal footer contract"
```

## Task 5: Preserve Existing Preview Behavior And Run Full Verification

**Files:**
- Modify: `src/components/projects/PreviewModal.test.tsx`
- Modify: `src/components/projects/PreviewModal.tsx`

- [ ] **Step 1: Keep or add regression coverage for existing behavior**

Ensure `src/components/projects/PreviewModal.test.tsx` still includes coverage for:

```tsx
test('builds chapter navigation from rendered content pages instead of duplicating toc-page entries', async () => { ... });
test('renders cover and back cover from the built preview structure', () => { ... });
test('uses a scaled spread frame so the fitted preview does not rely on transform-only layout', async () => { ... });
test('does not re-render a hidden subtitle from saved cover surface state', () => { ... });
```

If any were removed during refactor, restore them before implementation is considered complete.

- [ ] **Step 2: Run the targeted tests**

Run:

```bash
npm run test:run -- src/components/projects/PreviewModal.test.tsx src/components/projects/PreviewCanvas.test.tsx
```

Expected: PASS

- [ ] **Step 3: Run lint on touched files**

Run:

```bash
npx eslint src/components/projects/PreviewModal.tsx src/components/projects/PreviewModal.test.tsx
```

Expected: no errors

- [ ] **Step 4: Run visual verification in real viewports**

Run the local app and verify the modal in desktop and mobile using the browser tool:

```bash
npm run dev
```

Then validate:

- close button visible in header
- footer always visible
- no avoidable global modal scroll
- book spread is the visual focus
- sidebar behaves correctly on desktop
- mobile layout degrades without broken overlaps

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/PreviewModal.tsx src/components/projects/PreviewModal.test.tsx
git commit -m "feat: redesign preview modal as premium shell"
```

## Self-Review

- Spec coverage:
  - premium shell framing: Task 1
  - premium header and controls hierarchy: Task 2
  - editorial rail plus book-first stage: Task 3
  - persistent contractual footer: Task 4
  - source-of-truth preview behavior preserved: Task 5
  - desktop/mobile visual validation: Task 5
- Placeholder scan:
  - no `TODO`, `TBD`, or implicit “handle later” steps remain
  - every task includes concrete files, concrete tests, exact commands, and commit steps
- Type consistency:
  - plan uses `PreviewModal`, `PreviewPage`, `ProjectRecord`, `AppMessages['project']`, `buildPreviewPages()`, and existing `viewMode`/`format` state consistently
