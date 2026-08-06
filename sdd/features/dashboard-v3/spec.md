# Dashboard v3

## Scope

Replace the authenticated shell sidebar with a single top header and make `/dashboard` a full-screen project creation workspace. Move "Mis proyectos" to a modal table.

## Constraints

- Branch: `feature/dashboard-v3`, PR target `development`.
- Do not edit Claude zone: preview, compose, export or brand libraries.
- Preserve U4 uploads, U5 optional inputs, U6 document-data modal, U7 i18n and P-SHELL-01 container clamp.
- Batch validation once after implementation: lint, tests, build, visual matrix.

## Design

- DFII: 13/15, editorial cockpit refinado.
- Header: masthead brand, workspace copy, nav, one-value locale/theme toggles, user menu.
- Dashboard: horizontal creation layout on desktop, stacked on mobile.
- Projects: MODAL_CONTRACT table, updated-desc sort, 25-row pages, sticky header and mobile horizontal scroll.

## Acceptance

- No sidebar, collapse logic or sidebar persistence.
- Desktop dashboard has no vertical scroll at 1440x900 and 1366x768.
- Header burger appears at 375px; toggles remain visible.
- ES/EN parity for shell nav and project table columns.
