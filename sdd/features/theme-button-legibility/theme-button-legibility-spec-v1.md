# Theme-aware control legibility — spec v1

## Intent

Make interactive controls legible, visually consistent, and appropriately weighted across every Anclora Talent screen in dark and light themes. Preserve the Talent sky-blue identity while reducing the visual dominance of bright blue primary buttons in light mode.

## Scope

- Canonical `ac-button` variants, including primary, secondary, outline, ghost, destructive, selected, disabled, hover, active, and focus-visible states.
- Theme, language, and other global toggles; segmented controls; navigation selections; and icon-only buttons.
- Product workspaces that currently use local button families (`pw-*`, `cw-*`, `aw-*`, `ew-*`) and one-off button colors.
- Consistent foreground/background token pairing in dark and light themes, with accessible focus indicators and readable disabled text.

## Requirements

1. Dark and light themes define paired foreground, background, border, hover, selected, disabled, and focus tokens for controls.
2. Light theme primary actions use a calm, pale, desaturated teal-blue surface with a dark readable foreground; sky blue remains the structural accent for focus, links, and highlights.
3. Dark theme primary actions use a restrained Talent blue surface with a dark readable foreground; shadows and glows remain subtle.
4. Selected toggle/segmented states are distinct from primary CTAs and use a theme-appropriate selected surface and foreground.
5. Each control variant keeps one consistent interaction model across routes: hover, pressed, focus-visible, disabled, and reduced-motion behavior.
6. All normal text labels meet WCAG AA contrast (4.5:1); large text and non-text boundaries meet applicable WCAG AA thresholds. Disabled controls remain distinguishable and readable.
7. Audit and verification cover public/authenticated shells, dashboard/projects, project creation, content/chapters/editor, cover/back cover, preview/export, collaboration, and AI workspaces where reachable.
8. No business behavior, labels, destinations, or action availability changes.

## Acceptance criteria

- Theme token pairings are verified by automated contrast checks for representative solid colors and rendered browser samples for gradients.
- No canonical button selector relies on an unrelated global `color` or inherits the wrong theme foreground.
- Primary actions no longer dominate light surfaces with an oversaturated sky-blue fill; their text is high contrast in both themes.
- Toggle selections, icon buttons, and secondary actions remain visually distinct from primary actions.
- Representative routes render without illegible button labels, visible theme-specific text mismatches, clipped controls, or missing focus indicators at desktop, tablet, and mobile widths.
- Existing button functionality and keyboard semantics remain intact.

## Out of scope

- Reworking page layout, copy, workflow, or non-interactive content styling.
- Changing the cover artwork/document palette.
- Changing the app's brand hues or typography contract.
