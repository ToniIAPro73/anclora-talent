# Chapters True Visual Closure — Specification v1

## Scope

Remediate Step 2 (`Capítulos`) and the focused single-chapter editor against
the approved workspace mockups while preserving the existing chapter actions,
rich-text editing, navigation, save, and pagination behavior.

## Acceptance criteria

- Step 2 uses the canonical application stepper and no duplicated progress rail.
- Chapters overview presents list, selected chapter overview, and properties/
  health as a responsive three-column workspace.
- Row actions are compact, keyboard-accessible overflow actions rather than
  repeated large controls.
- The editor presents a focused header, shared stepper, grouped toolbar,
  outline, editable manuscript surface, inspector, and compact status area.
- Existing real editor commands remain available through the existing rich-text
  editor implementation; unsupported metadata is not fabricated.
- Dark, light, Spanish, English, and responsive layouts remain usable.

## Visual authority

- Validated Contenido workspace implementation and shared design-system classes.
- `docs/mockups/workspace-system-v1/07-chapters-v1.png`.
- `docs/mockups/workspace-system-v1/07b-chapter-editor-v1.png`.

## Data and runtime

No database schema or migration changes are required. Local and preview
verification use the repository's production-backed runtime contract.
