# Cover Studio compact controls — plan v1

## Implementation map

- `CoverStudioV2.tsx`: remove visible mode state/switch, Basic editor branch and extra action/help row; retain JSON/PNG handlers and pass compact action controls to the Professional editor toolbar.
- `AdvancedCoverEditor.tsx`: add a toolbar action slot, remove history actions from the top toolbar, render them above Import cover, compact zoom/save controls.
- `TextLayerProperties.tsx`: replace text-case segmented buttons with a localized select that preserves the same model values.
- `globals.css`: compact proportional sizing and responsive alignment, reusing existing Talent button tokens.
- Focused tests: update `CoverStudioV2`, `AdvancedCoverEditor`, workspace assembly and text property assertions.

## Sequence

1. Add failing regression tests for Pro-only rendering, compact action placement/accessibility, icon-only save/history, and text-case selection.
2. Refactor the shared wrapper and toolbar without changing surface persistence or package handlers.
3. Refine CSS for compact controls and canvas space at phone/tablet/desktop widths.
4. Run focused tests, type/lint checks at the integration boundary, and shared visual QA for both surfaces/themes.

## Constraints

- Work on `development`; no branch, database, deploy or promotion changes.
- Reuse the established Talent button states and theme tokens.
- No manual QA with Toni's personal account; use the dedicated QA identity if authentication is needed.
- Keep the eight-step workflow and existing canvas title/dimensions.
