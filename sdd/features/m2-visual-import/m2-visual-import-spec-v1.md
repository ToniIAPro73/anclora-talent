# M2 — Visual e2e with real imported content (v1)

## Goal

Prove end-to-end that importing `fixtures/exito_sin_compania.docx` (14 tables, 39 list
items, 11 REFLEXIÓN / 10 EJERCICIO blocks) renders correctly through the editorial
flow: analysis panel → chapter editor → preview → export surface, with no clipping or
overlap on the imported content nodes.

## Scope

- New e2e spec `e2e/visual-import.spec.ts` (Playwright, chromium, production build on
  `BASE_URL=http://localhost:3100`).
- Visual capture matrix script `test-results/m2-capture.mjs` → `test-results/visual/M2/`
  (desktop 1440×900 + mobile 375×667 × dark/light × es/en), surfaces: chapter editor
  (fullscreen, chapter containing a table) and full preview modal with imported pages.

## Assertions

- Import: `import-analysis-panel` visible, chapter count > 0, no blocking warnings.
- Editor: at least one chapter opens with `.ProseMirror` content; if the chapter
  contains a table it must render as `<table>` (if the editor's schema strips tables,
  R8: code wins — assert lists/REFLEXIÓN text instead and document the deviation).
- Preview: scanning all content pages, every rendered `table`, `ul`, `ol` and every
  REFLEXIÓN/EJERCICIO block fits its page: bounding box inside the page frame and
  `scrollWidth <= clientWidth + 1` (no clipping, no overlap).
- Export surface: `export-html-button`, `export-docx-button`, `export-epub-button`,
  `pdf-export-button` visible.
- V2 guards: no horizontal overflow introduced by content nodes (pre-existing mobile
  shell overflow documented in M1 is asserted against content nodes, not the shell);
  hex guard on touched files; i18n parity test green.

## Acceptance

- `BASE_URL=http://localhost:3100 npx playwright test e2e/visual-import.spec.ts` green.
- Capture matrix: desktop combos all green; mobile failures limited to the pre-existing
  shell overflow (identical scrollWidth to M1 baseline).
- Gates: lint 0, vitest suite green, build green, tsc with zero new errors (baseline 92).
- Atomic commit on `development`, no push. Screenshots never committed.
