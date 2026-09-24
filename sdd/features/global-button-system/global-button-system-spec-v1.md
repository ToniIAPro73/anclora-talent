# Global Button System — Landing as Visual Authority

## Status

Open implementation spec, version 1.

## Intent

Make the Landing button implementation the single visual source of truth for
normal application buttons while preserving interaction semantics and existing
business behavior.

## Contract

- The canonical primitive is the design-system `ac-button` family.
- Landing CTAs and toggles consume the same primitive as Dashboard, Contenido,
  Capítulos, Chapter Editor, cover tooling, preview, collaboration, AI, and
  export controls.
- Compact controls use `ac-button--compact`; icon-only controls additionally
  use `ac-button--icon` and retain an accessible name.
- Semantic variants remain distinct: primary, secondary, ghost, destructive,
  and selected/pressed states. Shared geometry, focus, hover, pressed,
  disabled, transition, and cursor behavior come from the canonical system.
- Dark and light themes use semantic tokens and must preserve the approved
  Landing rendering.
- No page-prefixed visual button family remains for the covered surfaces.

## Acceptance criteria

1. Landing buttons render with the same approved compact geometry and effects.
2. Representative Dashboard, Contenido, Capítulos, and Chapter Editor
   controls consume `ac-button` classes.
3. Icon-only controls use the compact icon composition and preserve ARIA,
   keyboard, disabled, and pressed behavior.
4. No `dashboard-button` visual implementation or duplicate page button family
   remains in application source.
5. Unit and focused Playwright coverage verifies default, hover, focus-visible,
   pressed/selected, disabled, dark, and light states.

## Audit map

| Current source | Canonical target |
| --- | --- |
| `.dashboard-button*` Landing/Dashboard family | `.ac-button ac-button--compact` plus semantic variant |
| `.ac-button*` workspace/editor controls | Keep and normalize through shared tokens |
| Landing cover toggle local Tailwind classes | `.ac-button--compact` with `aria-pressed` |
| Standalone icon controls with bespoke button chrome | `.ac-button--compact ac-button--icon` where they are standard actions |

