# Cover Studio compact controls — tasks v1

- [x] Add failing component assertions for no mode switch and compact toolbar actions.
- [x] Add failing editor assertions for icon-only history/save and the revised button placement.
- [x] Keep file read/validation errors separate from save status.
- [x] Replace text-case button group with a compact select; add behavior coverage for all three values.
- [x] Remove mode state and the extra toolbar row; keep the Professional editor as the sole visible editor.
- [x] Place JSON/PNG controls in the Professional toolbar with accessible names and correct directional icons.
- [x] Move history controls above Import cover and preserve disabled states.
- [x] Compact zoom and save controls while retaining accessible status.
- [x] Tune responsive layout for canvas priority and both themes.
- [x] Run focused tests and visual QA for cover/back-cover, Light/Dark, phone/tablet/desktop.

## Validation evidence

- Focused Vitest coverage: `CoverStudioV2`, `AdvancedCoverEditor`, `CoverWorkspace08A`, and `TextLayerProperties`.
- Shared `agent-browser` screenshots: `artifacts/qa/compact-controls/` for both surfaces, Light/Dark, and 390/768/1440 px.
- Dedicated QA identity: `e2e.auth@anclora-talent.test`; QA-owned project `QA ODT maquetado 2026-10-20`.
- Browser JSON re-import: NOT_RUN; the browser could export the package but refused to read the local file during upload. Import parsing and persistence remain covered by component tests.
