# Cover workspace vertical space — spec v1

## Intent

Give the cover and back-cover editing workspace more usable vertical space by removing the auxiliary panels below the canvas and placing history controls beside JSON/PNG actions.

## Requirements

1. Do not render the bottom «Revisión orientativa» or «Sistema de colección» panels in the cover and back-cover editing routes.
2. Keep Undo and Redo available as icon-only controls in the top file-action group beside JSON import/export and PNG export.
3. Do not render duplicate Undo/Redo controls in the left layers workspace.
4. Preserve enabled/disabled state, accessible names, tooltips, and undo/redo behavior.
5. Apply the same layout and behavior to cover and back cover.

## Acceptance criteria

- Cover and back-cover editor routes have no preflight or editorial collection panel after the editor.
- Undo/Redo controls are in the same action group as the JSON controls and are absent from the left column.
- Existing file-action controls and the canvas remain available.
