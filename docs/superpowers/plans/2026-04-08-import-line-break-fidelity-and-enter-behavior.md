# Import Line Break Fidelity And Enter Behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the multipage editor `Enter` regression and preserve explicit source line breaks more faithfully across supported import formats.

**Architecture:** Treat the editor regression and the import fidelity work as two bounded changes. First, lock down `Enter` so local paragraph insertion does not cascade synthetic page separators across the chapter. Second, preserve format-specific line-break intent in the import pipeline by carrying soft breaks as `<br>` and reducing over-aggressive normalization, while keeping PDF heuristic-based.

**Tech Stack:** Next.js, React 19, Tiptap v3, Vitest, Testing Library, Mammoth, WordExtractor

---

## File Map

- Modify: `src/components/projects/AdvancedRichTextEditor.selection.test.tsx`
  Purpose: add a failing regression test for `Enter` in the shared multipage editor
- Modify: `src/components/projects/AdvancedRichTextEditor.tsx`
  Purpose: prevent paragraph insertion from amplifying automatic page-break artifacts
- Modify: `src/lib/projects/import.test.ts`
  Purpose: add format-specific regression coverage for preserved line breaks
- Modify: `src/lib/projects/import-pipeline.ts`
  Purpose: preserve explicit line breaks as `<br>` and reduce destructive normalization by format
- Modify: `src/lib/projects/import.ts`
  Purpose: keep the import entrypoint aligned if normalized text handling changes

## Task 1: Fix The `Enter` Regression In The Multipage Editor

**Files:**
- Modify: `src/components/projects/AdvancedRichTextEditor.selection.test.tsx`
- Modify: `src/components/projects/AdvancedRichTextEditor.tsx`

- [ ] **Step 1: Write the failing regression test**

Add a test to `src/components/projects/AdvancedRichTextEditor.selection.test.tsx` that proves a local paragraph insertion does not multiply page-break artifacts:

```tsx
test('does not replicate page-break separators across the chapter when pressing Enter', () => {
  const editor = createMockEditor(createSelection('Hola', 2));
  const onUpdate = vi.fn();

  editor.getHTML = vi.fn(
    () =>
      '<h2>Introducción</h2><p>Esto es lo que se siente</p><p></p><p>Más contenido</p>',
  );

  useEditorMock.mockReturnValue(editor);

  render(
    <AdvancedRichTextEditor
      defaultContent="<h2>Introducción</h2><p>Esto es lo que se siente</p><p>Más contenido</p>"
      onUpdate={onUpdate}
      currentPage={0}
      totalPages={2}
    />,
  );

  const options = useEditorMock.mock.calls[0]?.[0] as {
    onUpdate?: ({ editor }: { editor: typeof editor }) => void;
  };

  options.onUpdate?.({ editor });

  const latestHtml = onUpdate.mock.calls.at(-1)?.[0] as string;
  expect((latestHtml.match(/data-page-break=/g) ?? []).length).toBeLessThanOrEqual(1);
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm run test:run -- src/components/projects/AdvancedRichTextEditor.selection.test.tsx`

Expected: FAIL because pressing `Enter` currently causes repeated visible separators or repeated break markup in the reconciled HTML path

- [ ] **Step 3: Write the minimal implementation**

In `src/components/projects/AdvancedRichTextEditor.tsx`, tighten the reconciliation path so local paragraph insertion only reflows automatic breaks when overflow genuinely changes.

Implementation sketch:

```ts
const currentHtml = ed.getHTML();
const reconciledHtml = reconcileOverflowBreaks(currentHtml, previewConfig);

if (normalizeEditorHtml(reconciledHtml) !== normalizeEditorHtml(currentHtml)) {
  const currentAutoBreaks = (currentHtml.match(/data-page-break="auto"/g) ?? []).length;
  const nextAutoBreaks = (reconciledHtml.match(/data-page-break="auto"/g) ?? []).length;

  if (Math.abs(nextAutoBreaks - currentAutoBreaks) <= 1) {
    isSyncingExternalContentRef.current = true;
    ed.commands.setContent(reconciledHtml, false);
    handleUpdate(reconciledHtml);
    return;
  }
}

handleUpdate(currentHtml);
```

Implementation note:
- keep manual page breaks intact
- do not treat a newly inserted empty paragraph as a signal to duplicate breaks globally
- if the real fix belongs in the reconciliation helper rather than the editor callback, move it there, but keep the behavior proven by the test

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm run test:run -- src/components/projects/AdvancedRichTextEditor.selection.test.tsx`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/AdvancedRichTextEditor.selection.test.tsx src/components/projects/AdvancedRichTextEditor.tsx
git commit -m "fix enter regression in multipage editor flow"
```

## Task 2: Preserve Explicit Line Breaks In Imported Content

**Files:**
- Modify: `src/lib/projects/import.test.ts`
- Modify: `src/lib/projects/import-pipeline.ts`
- Modify: `src/lib/projects/import.ts`

- [ ] **Step 1: Write the failing import tests**

Add four focused tests to `src/lib/projects/import.test.ts`:

```ts
test('docx/rich html preserves soft line breaks as br tags', async () => {
  vi.doMock('server-only', () => ({}));

  const { buildImportedDocumentSeed } = await import('./import');
  const result = buildImportedDocumentSeed({
    fileName: 'demo.docx',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    text: 'texto normalizado',
    html: '<p>Primera línea<br />Segunda línea</p><h1>Capítulo uno</h1><p>Texto</p>',
  });

  expect(result.chapters?.[0].blocks.some((block) => block.content.includes('<br'))).toBe(true);
});

test('markdown preserves hard line breaks as br tags', async () => {
  vi.doMock('server-only', () => ({}));

  const { buildImportedDocumentSeed } = await import('./import');
  const result = buildImportedDocumentSeed({
    fileName: 'demo.md',
    mimeType: 'text/markdown',
    text: ['# Capítulo uno', '', 'Primera línea', 'Segunda línea'].join('\\n'),
  });

  expect(result.chapters?.[0].blocks.some((block) => block.content.includes('<br'))).toBe(true);
});

test('txt preserves explicit line breaks inside imported paragraphs', async () => {
  vi.doMock('server-only', () => ({}));

  const { buildImportedDocumentSeed } = await import('./import');
  const result = buildImportedDocumentSeed({
    fileName: 'demo.txt',
    mimeType: 'text/plain',
    text: ['Capítulo uno', '', 'Primera línea', 'Segunda línea'].join('\\n'),
  });

  expect(result.chapters?.[0].blocks.some((block) => block.content.includes('<br'))).toBe(true);
});

test('pdf still merges obvious visual wraps while preserving blank-line paragraphs', async () => {
  vi.doMock('server-only', () => ({}));

  const { buildImportedDocumentSeed } = await import('./import');
  const result = buildImportedDocumentSeed({
    fileName: 'demo.pdf',
    mimeType: 'application/pdf',
    text: ['Capítulo uno', '', 'Primera línea cortada', 'por ancho de página', '', 'Nuevo párrafo'].join('\\n'),
  });

  const chapterHtml = result.chapters?.[0].blocks.map((block) => block.content).join('\\n') ?? '';
  expect(chapterHtml).toContain('Primera línea cortada por ancho de página');
  expect(chapterHtml).toContain('Nuevo párrafo');
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm run test:run -- src/lib/projects/import.test.ts`

Expected: FAIL because current normalization collapses or rewrites many explicit line breaks instead of preserving them as `<br>`

- [ ] **Step 3: Write the minimal implementation**

In `src/lib/projects/import-pipeline.ts`, introduce format-aware line-break preservation helpers.

Add helpers like:

```ts
function preserveInlineLineBreaks(input: string) {
  return input
    .split('\n')
    .map((line) => escapeHtml(line.trim()))
    .filter(Boolean)
    .join('<br />');
}

function paragraphFromLines(lines: string[]) {
  const joined = preserveInlineLineBreaks(lines.join('\n'));
  return joined ? `<p>${joined}</p>` : '';
}
```

Then apply these rules:

- rich HTML (`docx` / Google Docs-like HTML): keep incoming `<br>` and stop stripping them out during block normalization
- markdown: when a logical paragraph contains explicit line breaks, render them as `<br />` inside the paragraph block
- txt: preserve single explicit source line breaks as `<br />` and blank lines as paragraph boundaries
- pdf: keep the current heuristic behavior, but only merge consecutive lines when they look like visual wraps; preserve blank-line paragraph boundaries

Concrete implementation points:

```ts
function stripTags(input: string) {
  return decodeHtmlEntities(
    input
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<\/h[1-6]>/gi, '\n\n')
      .replace(/<\/li>/gi, '\n')
      .replace(/<\/blockquote>/gi, '\n\n')
      .replace(/<[^>]+>/g, ' ')
  );
}
```

```ts
function buildParagraphHtmlFromRawLines(lines: string[]) {
  const raw = lines.map((line) => line.replace(/\r/g, '')).filter((line) => line.trim().length > 0);
  if (raw.length === 0) return '';
  return `<p>${raw.map((line) => escapeHtml(line.trim())).join('<br />')}</p>`;
}
```

```ts
function shouldMergePdfLine(next: string, current: string) {
  return !/[.!?:;]$/.test(current.trim()) && /^[a-záéíóúñ0-9(]/i.test(next.trim());
}
```

Implementation note:
- do not globally replace all `\n` with spaces anymore
- preserve source-intent where the format exposes it reliably
- keep PDF heuristic-specific instead of applying docx/txt rules blindly

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm run test:run -- src/lib/projects/import.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/projects/import.test.ts src/lib/projects/import-pipeline.ts src/lib/projects/import.ts
git commit -m "preserve explicit line breaks in imported documents"
```

## Task 3: Final Verification Sweep

**Files:**
- Modify: `src/components/projects/AdvancedRichTextEditor.tsx` (only if tests expose a regression)
- Modify: `src/lib/projects/import-pipeline.ts` (only if tests expose a regression)

- [ ] **Step 1: Run the targeted regression suite**

Run: `npm run test:run -- src/components/projects/AdvancedRichTextEditor.selection.test.tsx src/lib/projects/import.test.ts src/components/projects/advanced-chapter-editor/useChapterEditor.test.tsx`

Expected: PASS

- [ ] **Step 2: Run eslint on touched files**

Run: `npx eslint src/components/projects/AdvancedRichTextEditor.tsx src/components/projects/AdvancedRichTextEditor.selection.test.tsx src/lib/projects/import.ts src/lib/projects/import-pipeline.ts src/lib/projects/import.test.ts`

Expected: no output

- [ ] **Step 3: Manual browser verification**

Run:

```bash
npm run dev
```

Expected manual checks:
- pressing `Enter` in page 1 creates a local paragraph break only
- pressing `Enter` in page 2 does not inject repeated horizontal separators across the chapter
- imported `docx`/Google Docs chapter keeps visible intra-paragraph line breaks
- imported `markdown` and `txt` preserve explicit source line breaks
- imported `pdf` still reads naturally without obvious line-wrap fragmentation

- [ ] **Step 4: Commit**

```bash
git add .
git commit -m "ship enter regression fix and import line-break fidelity"
```

## Self-Review

### Spec coverage

- `Enter` regression: covered by Task 1
- explicit line-break fidelity by format: covered by Task 2
- final integrated validation: covered by Task 3

### Placeholder scan

- all tasks have explicit files, commands, and test intent
- no `TODO`, `TBD`, or “handle appropriately” placeholders remain

### Type consistency

- editor-side terminology stays aligned around manual/auto page breaks and reconciled HTML
- import-side terminology stays aligned around paragraph boundaries and soft line breaks as `<br>`
