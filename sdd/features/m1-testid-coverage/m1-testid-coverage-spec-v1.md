# M1 — Full `data-testid` coverage on interactive controls (v1)

## Goal

Every interactive control rendered by `src/components/projects/**` (workspace, chapter
editor, cover studio, preview, dialogs, panels) exposes a stable `data-testid` so e2e
and RTL tests can target controls without brittle CSS/text selectors.

## Convention

- kebab-case, descriptive, prefixed by surface: `editor-toolbar-bold-button`,
  `preview-modal-next-button`, `cover-palette-select`, `chapter-editor-save-button`.
- List items rendered in loops use a template testid derived from a stable key:
  `data-testid={`margin-preset-${key}`}`.
- `ToolbarButton`-style wrappers accept a `dataTestId` prop forwarded to `data-testid`
  (existing pattern in `RichTextEditor.tsx` / `EnhancedRichTextEditor.tsx`).

## Scope

All `button`, `input`, `select`, `a[role="button"]` under `src/components/projects/`.

## Documented exceptions (no `data-testid` by design)

- Full-screen backdrop/overlay `div`s whose `onClick` only dismisses a modal
  (`ac-modal__backdrop`, fixed overlay containers) — not semantic controls; dismissal is
  covered by explicit close buttons and keyboard handlers.
- Inner wrapper `div`s with `onClick={(e) => e.stopPropagation()}` — event plumbing, not controls.
- `RichTextEditor.tsx` / `EnhancedRichTextEditor.tsx` toolbar call sites — already covered
  via the `dataTestId` prop (verified by existing tests).

## Acceptance

- Static scan of `src/components/projects/**`: interactive elements without `data-testid`
  ≈ 0 (only exceptions above).
- New contract test `src/components/projects/testid-coverage-contract.test.ts` enforces the
  scan in CI.
- Existing RTL tests extended where trivial to assert the new testids render.
- Gates: `npm run lint` clean, `npm run test:run` green, `npm run build` green, no new
  `tsc` errors vs baseline (92 lines at start), visual protocol V0–V3 green.
