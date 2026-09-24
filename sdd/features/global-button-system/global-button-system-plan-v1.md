# Global Button System Plan

## Scope

Refactor button presentation only. Preserve routes, handlers, form methods,
disabled conditions, ARIA attributes, keyboard behavior, and analytics hooks.

## Sequence

1. Record the current Landing implementation and design-system contract.
2. Move Landing CTAs and selected controls to `ac-button--compact`.
3. Encode the approved Landing compact geometry/effects in shared semantic
   tokens and remove the former workspace-specific CSS family.
4. Normalize representative Dashboard, Chapters, modal, and editor controls.
5. Add source-level contract tests and run focused unit/E2E/visual checks.

## Verification

- `npm run test:run` focused button and affected component suites.
- `npm run lint` and `npm run build`.
- `anclora-visual-qa doctor`, page integrity, and dark/light screenshots.
- Landing Playwright regression plus authenticated header parity where the
  dedicated QA account is available.

