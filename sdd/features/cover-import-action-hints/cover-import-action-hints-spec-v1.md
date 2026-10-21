# Cover import action hints — spec v1

Status: active. Date: 2026-10-21.

## Goal

Explain the impact of background-image, flattened-cover, and editable-JSON imports before a user chooses a file.

## Requirements

1. Background image upload and replacement show a localized hover/focus hint explaining that only the background is changed and foreground layers are preserved.
2. Raster cover/back-cover import shows a localized hover/focus hint explaining that the active design is replaced and its existing layers are removed, leaving the imported flat artwork.
3. Editable JSON import shows a localized hover/focus hint explaining that only the active surface section is imported, the active surface design/layers are replaced, and the companion surface is untouched.
4. Hints remain available to keyboard and assistive-technology users and fit within the viewport without affecting editor layout.
5. English and Spanish messages are provided.

## Acceptance criteria

- Hovering or focusing each action displays its contextual hint.
- The button has an accessible description containing the same hint.
- Cover and back-cover JSON hints identify the active surface correctly.
- Background hint distinguishes background-only replacement from flat and JSON imports.
