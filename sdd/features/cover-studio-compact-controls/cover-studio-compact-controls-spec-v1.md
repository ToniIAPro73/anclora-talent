# Cover Studio compact controls — specification v1

Status: active. Date: 2026-10-20.

## Goal

Make the cover and back-cover work area more spacious and visually consistent by removing the Basic/Pro mode switch, consolidating actions into compact controls, and sizing controls to their content. Both routes always open the existing Professional editor.

## Requirements

1. The cover and back-cover routes render the existing Professional editor by default and do not display Basic/Pro mode buttons.
2. Remove the separate mode/action bar and place editable JSON import/export and PNG export as compact icon-only controls in the editor toolbar. Keep the canvas label that identifies Portada/Contraportada and dimensions.
3. Use an outward-facing export icon for PNG. Every icon-only action keeps a localized accessible name, tooltip and keyboard focus treatment.
4. Remove visible JSON/PNG text labels and persistent JSON help copy. Keep import/export result feedback and error reporting accessible.
5. File read and validation errors must not be presented as save failures; set save error status only after a persistence action fails.
6. Move undo/redo out of the top toolbar. Place icon-only undo/redo controls in the left workspace column immediately above Import cover, with localized names and disabled history states.
7. Make Save final icon-only while preserving status for assistive technology and a localized tooltip that reflects saving, saved, error or final state.
8. Replace the wide three-button text-case control with one compact select that retains Normal, uppercase and lowercase behavior.
9. Size the zoom control to its contents, keep the Talent button/toggle visual language, and preserve the eight-step workflow, canvas tools, layers, properties, templates, export/import behavior, and both themes.
10. Reclaim vertical and horizontal space for the canvas at desktop, tablet and mobile widths without clipping or overlap. Use shared layout behavior for cover and back cover.

## Acceptance criteria

- Both surfaces open the Professional editor; no Basic/Pro selector is present.
- JSON import, JSON export and PNG export are icon-only, accessible, and reachable from the compact editor toolbar; PNG export uses an outward-facing icon.
- Undo/redo are icon-only in the left workspace immediately above Import cover, and remain correctly enabled/disabled.
- Save is icon-only visually, with an accessible name/status and unchanged save behavior.
- Text transformation is a single compact select and all three values update the selected text layer.
- Zoom width is compact and does not consume a large toolbar segment.
- The eight-step navigation and canvas title/dimensions remain visible.
- Existing artwork editing, import/export, autosave and history behavior remain intact on cover and back-cover routes.
- Focused component tests and shared visual QA confirm no clipping or collisions at phone, tablet and desktop sizes in Light and Dark themes.

## Out of scope

No changes to persisted design formats, editor capabilities, global app header, workflow steps, database, or deployment.
