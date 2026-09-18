# New project workspace redesign v1

## Goal

Materialize `docs/mockups/workspace-system-v1/00b-new-project-v1.png` on the existing `/projects/new` route while preserving the governed project creation flow.

## Acceptance criteria

- The route presents a focused New project workspace with the official Anclora Talent brand asset, a dashboard return action, and no dashboard secondary navigation.
- The form is organized into the mockup's project, base document, editorial system, and brand identity sections, with a responsive two-column summary on desktop and a single-column flow on tablet/mobile.
- Existing title, document import, PDF mode, product template, editorial reference profile, brand manual, preprocessing state, fixed-PDF error, and create action remain functional.
- The summary reflects the selected document, editorial style, and brand state and disables creation while preprocessing is active.
- At widths below the desktop layout threshold, controls remain usable without horizontal overflow or clipped content.

## Out of scope

- New persistence semantics for drafts or unsupported help actions.
- Changes to the editor, dashboard project pagination, or import APIs.
