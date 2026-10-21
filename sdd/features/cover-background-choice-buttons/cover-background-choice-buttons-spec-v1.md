# Cover background choice buttons — spec v1

## Goal
Make the background type and image fit controls clear, compact, and consistent with the cover editor's left tool rail in light and dark themes.

## Requirements
- Render each background type and image fit option as its own separated icon button, with no shared segmented-card treatment.
- Match the left tool rail's selected blue surface and left accent stripe.
- Use distinct icons for fill, fit, and original size.
- Preserve accessible names, pressed state, tooltips, and existing selection behavior.

## Acceptance
- Both option groups use separate button tiles and the shared active rail style.
- Existing background selection and image-fit behavior remains intact.
- Component tests cover visual classes and distinct fit icons.
