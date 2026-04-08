# Chapter Editor Selection Behavior Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the advanced chapter editor apply formatting only to explicit selections, the current word, or the current populated paragraph depending on context, while keeping margins global and improving the size/color/margins controls.

**Architecture:** The implementation stays inside the existing Tiptap editor surface. We will introduce small target-resolution helpers for inline-word and block-paragraph behavior, route toolbar actions through those helpers, harden the font-size command contract, and expand the toolbar UI without changing the document model or preview pipeline.

**Tech Stack:** Next.js App Router, React, TypeScript, Tiptap, Vitest, Testing Library, Tailwind utility classes.

---

## File Map

- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\AdvancedRichTextEditor.tsx`
  Responsibility: central toolbar behavior, inferred-target helpers, expanded size/color options, button enablement.
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\editor-selection-utils.ts`
  Responsibility: pure helper logic for resolving word and paragraph targets from editor state.
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\editor-selection-utils.test.ts`
  Responsibility: unit coverage for inferred word/block target rules.
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\font-size-extension.ts`
  Responsibility: align extension semantics with the stricter toolbar contract.
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\MarginSelector.tsx`
  Responsibility: larger, scrollable, non-clipped dropdown.
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\MarginSelector.test.tsx`
  Responsibility: dropdown render and scrollability regression coverage.

### Task 1: Add Pure Selection-Target Helpers

**Files:**
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\editor-selection-utils.ts`
- Test: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\editor-selection-utils.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, test } from 'vitest';
import {
  findWordRange,
  hasUsableWordAtCursor,
  hasUsableParagraphAtCursor,
} from './editor-selection-utils';

describe('editor selection utils', () => {
  test('finds the current word around a collapsed cursor inside text', () => {
    expect(findWordRange('hola mundo', 1)).toEqual({ from: 0, to: 4 });
    expect(findWordRange('hola mundo', 6)).toEqual({ from: 5, to: 10 });
  });

  test('returns null when cursor is on whitespace or punctuation', () => {
    expect(findWordRange('hola mundo', 4)).toBeNull();
    expect(findWordRange('hola, mundo', 4)).toBeNull();
  });

  test('detects usable word and paragraph contexts', () => {
    expect(hasUsableWordAtCursor('capitulo', 3)).toBe(true);
    expect(hasUsableWordAtCursor('   ', 1)).toBe(false);
    expect(hasUsableParagraphAtCursor('texto del parrafo')).toBe(true);
    expect(hasUsableParagraphAtCursor('   ')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/projects/editor-selection-utils.test.ts`
Expected: FAIL because `editor-selection-utils.ts` does not exist yet.

- [ ] **Step 3: Write minimal implementation**

```ts
const WORD_CHAR_RE = /[\p{L}\p{N}_'-]/u;

export function findWordRange(text: string, cursorIndex: number) {
  if (!text || cursorIndex < 0 || cursorIndex >= text.length) return null;
  if (!WORD_CHAR_RE.test(text[cursorIndex] ?? '')) return null;

  let start = cursorIndex;
  let end = cursorIndex + 1;

  while (start > 0 && WORD_CHAR_RE.test(text[start - 1] ?? '')) start--;
  while (end < text.length && WORD_CHAR_RE.test(text[end] ?? '')) end++;

  if (start === end) return null;
  return { from: start, to: end };
}

export function hasUsableWordAtCursor(text: string, cursorIndex: number) {
  return findWordRange(text, cursorIndex) !== null;
}

export function hasUsableParagraphAtCursor(text: string) {
  return text.trim().length > 0;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/projects/editor-selection-utils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/editor-selection-utils.ts src/components/projects/editor-selection-utils.test.ts
git commit -m "test: add editor selection target helpers"
```

### Task 2: Route Inline and Block Toolbar Actions Through Inferred Targets

**Files:**
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\AdvancedRichTextEditor.tsx`
- Create: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\editor-selection-utils.ts`

- [ ] **Step 1: Write the failing test**

Add this integration-oriented assertion block to `src/components/projects/editor-selection-utils.test.ts` if keeping helpers pure, or create a narrow toolbar-behavior test if the file already exists:

```ts
test('does not report a usable word when cursor sits on blank content', () => {
  expect(hasUsableWordAtCursor('', 0)).toBe(false);
  expect(hasUsableParagraphAtCursor('')).toBe(false);
});
```

This is the minimum failing red step protecting the empty-area contract before wiring the toolbar.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/projects/editor-selection-utils.test.ts`
Expected: FAIL if the new assertions are not implemented yet.

- [ ] **Step 3: Write minimal implementation**

Update `AdvancedRichTextEditor.tsx` to introduce helpers along these lines and replace direct formatting calls:

```ts
import { TextSelection } from '@tiptap/pm/state';
import {
  findWordRange,
  hasUsableParagraphAtCursor,
  hasUsableWordAtCursor,
} from './editor-selection-utils';

const applyToWordOrSelection = (command: (chain: ReturnType<typeof editor.chain>) => ReturnType<typeof editor.chain>) => {
  const { state, view } = editor;
  const { selection } = state;

  if (!selection.empty) {
    command(editor.chain().focus()).run();
    return true;
  }

  const { $from } = selection;
  const parentText = $from.parent.textContent ?? '';
  const cursorIndex = $from.parentOffset;
  const wordRange = findWordRange(parentText, cursorIndex);
  if (!wordRange) return false;

  const from = $from.start() + wordRange.from;
  const to = $from.start() + wordRange.to;
  const transaction = state.tr.setSelection(TextSelection.create(state.doc, from, to));
  view.dispatch(transaction);
  command(editor.chain().focus()).run();
  return true;
};

const applyToParagraphOrSelection = (command: (chain: ReturnType<typeof editor.chain>) => ReturnType<typeof editor.chain>) => {
  const { selection } = editor.state;
  if (!selection.empty) {
    command(editor.chain().focus()).run();
    return true;
  }

  const paragraphText = selection.$from.parent.textContent ?? '';
  if (!hasUsableParagraphAtCursor(paragraphText)) return false;
  command(editor.chain().focus()).run();
  return true;
};
```

Then route buttons through those helpers:

```ts
<ToolbarButton onClick={() => applyToWordOrSelection((chain) => chain.toggleBold())} ... />
<ToolbarButton onClick={() => applyToParagraphOrSelection((chain) => chain.toggleHeading({ level: 1 }))} ... />
<ToolbarButton onClick={() => applyToParagraphOrSelection((chain) => chain.setTextAlign('justify'))} ... />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/projects/editor-selection-utils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/AdvancedRichTextEditor.tsx src/components/projects/editor-selection-utils.ts src/components/projects/editor-selection-utils.test.ts
git commit -m "feat: infer word and paragraph targets in editor toolbar"
```

### Task 3: Disable Text-Sensitive Controls Only in Empty Contexts

**Files:**
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\AdvancedRichTextEditor.tsx`

- [ ] **Step 1: Write the failing test**

Add a small pure-state guard test to `src/components/projects/editor-selection-utils.test.ts`:

```ts
test('treats whitespace-only paragraph as unusable formatting context', () => {
  expect(hasUsableParagraphAtCursor('   ')).toBe(false);
  expect(hasUsableWordAtCursor('   ', 0)).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/projects/editor-selection-utils.test.ts`
Expected: FAIL if the guards are not implemented.

- [ ] **Step 3: Write minimal implementation**

In `AdvancedRichTextEditor.tsx`, derive toolbar enablement from current context instead of just `selection.empty`:

```ts
const selection = editor.state.selection;
const parentText = selection.$from.parent.textContent ?? '';
const inlineTargetAvailable =
  !selection.empty || hasUsableWordAtCursor(parentText, selection.$from.parentOffset);
const blockTargetAvailable =
  !selection.empty || hasUsableParagraphAtCursor(parentText);
```

Then wire controls:

```ts
<ToolbarButton disabled={!inlineTargetAvailable} ... />
<ToolbarButton disabled={!blockTargetAvailable} ... />
```

Keep global controls enabled:

```ts
<MarginSelector ... />
<ToolbarButton onClick={() => setDevice('mobile')} ... />
<ToolbarButton onClick={() => editor.chain().focus().undo().run()} ... />
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/projects/editor-selection-utils.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/AdvancedRichTextEditor.tsx src/components/projects/editor-selection-utils.test.ts
git commit -m "fix: disable editor formatting only in empty contexts"
```

### Task 4: Expand the Font Size Scale and Keep Preference Persistence

**Files:**
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\AdvancedRichTextEditor.tsx`
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\font-size-extension.ts`

- [ ] **Step 1: Write the failing test**

Add a contract-style test:

```ts
import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('advanced editor font size scale', () => {
  test('offers the expanded editorial size scale', () => {
    const file = fs.readFileSync(
      path.join(process.cwd(), 'src/components/projects/AdvancedRichTextEditor.tsx'),
      'utf8',
    );

    expect(file).toContain("value: '10px'");
    expect(file).toContain("value: '48px'");
  });
});
```

Save as `src/components/projects/AdvancedRichTextEditor.fonts.test.ts`.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/projects/AdvancedRichTextEditor.fonts.test.ts`
Expected: FAIL because the current scale only includes `12px` through `32px`.

- [ ] **Step 3: Write minimal implementation**

Update the size list in `AdvancedRichTextEditor.tsx`:

```ts
const sizes = [
  { name: '10', value: '10px' },
  { name: '11', value: '11px' },
  { name: '12', value: '12px' },
  { name: '14', value: '14px' },
  { name: '16', value: '16px' },
  { name: '18', value: '18px' },
  { name: '20', value: '20px' },
  { name: '24', value: '24px' },
  { name: '28', value: '28px' },
  { name: '32', value: '32px' },
  { name: '36', value: '36px' },
  { name: '48', value: '48px' },
];
```

Tighten the extension comment/behavior in `font-size-extension.ts`:

```ts
setFontSize:
  (fontSize: string) =>
  ({ commands }) => {
    return commands.setMark('textStyle', { fontSize });
  },
```

Remove comments that imply collapsed-cursor application is expected behavior.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/projects/AdvancedRichTextEditor.fonts.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/AdvancedRichTextEditor.tsx src/components/projects/font-size-extension.ts src/components/projects/AdvancedRichTextEditor.fonts.test.ts
git commit -m "feat: expand editorial font size scale"
```

### Task 5: Expand the Text Color Palette

**Files:**
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\AdvancedRichTextEditor.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/projects/AdvancedRichTextEditor.colors.test.ts`:

```ts
import { describe, expect, test } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('advanced editor color palette', () => {
  test('contains expanded curated editorial colors', () => {
    const file = fs.readFileSync(
      path.join(process.cwd(), 'src/components/projects/AdvancedRichTextEditor.tsx'),
      'utf8',
    );

    expect(file).toContain('#EDF2F8');
    expect(file).toContain('#94A3B8');
    expect(file).toContain('#F59E0B');
    expect(file).toContain('#14B8A6');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/projects/AdvancedRichTextEditor.colors.test.ts`
Expected: FAIL because the current palette is smaller and missing some target values.

- [ ] **Step 3: Write minimal implementation**

Expand the palette array in `AdvancedRichTextEditor.tsx`, for example:

```ts
const colors = [
  { name: 'Por Defecto', value: 'inherit', description: 'Color normal del texto' },
  { name: 'Blanco Papel', value: '#EDF2F8', description: 'Máximo contraste claro' },
  { name: 'Marfil Suave', value: '#E5E7EB', description: 'Neutro cálido suave' },
  { name: 'Gris Azulado', value: '#B0C4D8', description: 'Texto secundario' },
  { name: 'Pizarra Clara', value: '#94A3B8', description: 'Neutro editorial frío' },
  { name: 'Oro Premium', value: '#C49A24', description: 'Énfasis elegante' },
  { name: 'Ámbar', value: '#F59E0B', description: 'Acento cálido intenso' },
  { name: 'Azul Editorial', value: '#4A9FD8', description: 'Acento profesional' },
  { name: 'Azul Profundo', value: '#60A5FA', description: 'Matiz frío más vivo' },
  { name: 'Menta', value: '#2DD4BF', description: 'Acento moderno' },
  { name: 'Teal', value: '#14B8A6', description: 'Acento editorial equilibrado' },
  { name: 'Coral', value: '#FB7185', description: 'Acento cálido' },
  { name: 'Rosa Quemado', value: '#F43F5E', description: 'Acento dramático' },
];
```

Keep the selector curated and grid-based.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/projects/AdvancedRichTextEditor.colors.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/AdvancedRichTextEditor.tsx src/components/projects/AdvancedRichTextEditor.colors.test.ts
git commit -m "feat: expand chapter editor color palette"
```

### Task 6: Fix the Margins Dropdown Layout

**Files:**
- Modify: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\MarginSelector.tsx`
- Test: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\MarginSelector.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, expect, test } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MarginSelector } from './MarginSelector';

describe('MarginSelector', () => {
  test('opens a scrollable dropdown with margin controls and estimate', async () => {
    const user = userEvent.setup();

    render(
      <MarginSelector
        margins={{ top: 24, bottom: 24, left: 24, right: 24 }}
        onMarginsChange={() => {}}
        wordsPerPage={450}
      />,
    );

    await user.click(screen.getByRole('button', { name: /configuración de márgenes/i }));

    expect(screen.getByText(/márgenes personalizados/i)).toBeInTheDocument();
    expect(screen.getByText(/~450 palabras\/página/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/projects/MarginSelector.test.tsx`
Expected: FAIL if the accessible button name or rendered content is not stable enough yet.

- [ ] **Step 3: Write minimal implementation**

Update `MarginSelector.tsx` to give the panel more room and scrolling:

```tsx
<div className="absolute left-0 top-11 z-[140] w-[360px] max-h-[min(70vh,32rem)] overflow-y-auto rounded-2xl border border-[var(--border-strong)] bg-[#0E1825] p-4 shadow-2xl shadow-black">
```

Adjust control sizing so labels do not crowd:

```tsx
<div className="space-y-2 px-2">
  <div className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3">
```

Keep the estimate footer inside the scrollable panel and preserve current behavior.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test -- src/components/projects/MarginSelector.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/projects/MarginSelector.tsx src/components/projects/MarginSelector.test.tsx
git commit -m "fix: make margin selector fully visible"
```

### Task 7: Run the Focused Verification Suite

**Files:**
- Test: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\editor-selection-utils.test.ts`
- Test: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\AdvancedRichTextEditor.fonts.test.ts`
- Test: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\AdvancedRichTextEditor.colors.test.ts`
- Test: `C:\Users\antonio.ballesterosa\Desktop\Proyectos\anclora-talent\src\components\projects\MarginSelector.test.tsx`

- [ ] **Step 1: Run the focused test suite**

Run:

```bash
npm test -- src/components/projects/editor-selection-utils.test.ts src/components/projects/AdvancedRichTextEditor.fonts.test.ts src/components/projects/AdvancedRichTextEditor.colors.test.ts src/components/projects/MarginSelector.test.tsx
```

Expected: PASS

- [ ] **Step 2: Run lint on the touched files**

Run:

```bash
npx eslint src/components/projects/AdvancedRichTextEditor.tsx src/components/projects/editor-selection-utils.ts src/components/projects/editor-selection-utils.test.ts src/components/projects/font-size-extension.ts src/components/projects/MarginSelector.tsx src/components/projects/MarginSelector.test.tsx src/components/projects/AdvancedRichTextEditor.fonts.test.ts src/components/projects/AdvancedRichTextEditor.colors.test.ts
```

Expected: no errors

- [ ] **Step 3: Commit the verification-safe state**

```bash
git add src/components/projects/AdvancedRichTextEditor.tsx src/components/projects/editor-selection-utils.ts src/components/projects/editor-selection-utils.test.ts src/components/projects/font-size-extension.ts src/components/projects/MarginSelector.tsx src/components/projects/MarginSelector.test.tsx src/components/projects/AdvancedRichTextEditor.fonts.test.ts src/components/projects/AdvancedRichTextEditor.colors.test.ts
git commit -m "test: verify chapter editor selection behavior flow"
```

## Self-Review

- Spec coverage:
  - explicit selection priority: covered in Tasks 1-3
  - current-word inference for inline controls: covered in Tasks 1-2
  - current-paragraph inference for block controls: covered in Tasks 1-3
  - empty-area no-op behavior: covered in Tasks 1-3
  - global margins behavior: covered in Task 6
  - expanded font sizes: covered in Task 4
  - expanded color palette: covered in Task 5
  - margins dropdown visibility fix: covered in Task 6
  - verification/tests: covered in Task 7
- Placeholder scan:
  - no `TODO`, `TBD`, or deferred implementation language left in tasks
- Type consistency:
  - helper names are consistently `findWordRange`, `hasUsableWordAtCursor`, and `hasUsableParagraphAtCursor`
  - main toolbar helpers are consistently `applyToWordOrSelection` and `applyToParagraphOrSelection`

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-04-08-chapter-editor-selection-behavior.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
