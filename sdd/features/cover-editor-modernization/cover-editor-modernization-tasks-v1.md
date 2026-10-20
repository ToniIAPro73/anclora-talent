# Cover editor modernization — tasks v1

## Phase 1 — Canvas-first layout

- [x] Add a failing test that layers have a dedicated column, separate from tools and properties.
- [x] Move the layer list into its own full-height region with independent scrolling.
- [x] Give the canvas the flexible center column and retain all tool/layer/property actions.
- [x] Apply token-derived panel and stage surfaces in Light and Dark without changing control styles.
- [x] Add narrow viewport stacking behavior and verify no controls are clipped.
- [x] Add the canonical eight-step navigation to direct cover routes and reduce editor header height.
- [x] Standardize the global header to brand, Dashboard, language/theme toggles, and user menu; remove duplicate preview/document actions and the contextual header row.
- [x] Rebalance cover tool/panel widths so the canvas receives more desktop space; compact tool categories on mobile.
- [x] Run focused tests and record Light/Dark visual QA evidence.

## Phase 2 — Basic/Professional parity

- [x] Mount `BasicCoverEditor` from the shared V2 wrapper.
- [x] Add a mode control with localized, accessible labels.
- [x] Prove Basic ↔ Professional changes retain the shared model state.
- [x] Verify Basic mode on both surfaces and optimize the mobile preview order.

## Phase 3 — Editable JSON

- [x] Specify and validate a versioned two-surface package.
- [x] Define portable asset packaging and rejection limits.
- [x] Add deterministic lossless round-trip and unsupported-field tests.
- [x] Expose JSON import/export with explicit JSON labels, add PNG export in Basic and Professional, and report import errors.
- [x] Verify editable JSON export and PNG downloads in the shared browser runtime.
- [ ] Complete browser JSON re-import verification; the browser file chooser rejected the local file read during QA.

## Phase 4 — Feature parity and additions

- [x] Reconcile documented capability rows with source and focused tests; retain explicit parity gaps.
- [ ] Close the remaining guide undo-history, inspector, and advanced interaction gaps.
- [x] Add advisory preflight, collection layout profiles, named proof checkpoints, and resize constraints with recovery.
- [ ] Complete the full parity matrix through the shared visual QA runtime.

## Current checkpoint

- [x] Repository clean at start; branch `development`; no extra worktrees.
- [x] Read current contracts, existing V2 implementation/status, prototype audit, and supplied Light/Dark mockups.
- [x] Confirmed active V2 routes and identified Basic mode / JSON UI gaps.
- [x] Phase 1 implementation and focused verification.
- [x] Finish the core modernization and additions; finish only the remaining focused browser and parity checks.
