# Global Button System Tasks

- [x] Inspect the approved Landing implementation and design-system button contract.
- [x] Audit page-specific button classes and map them to `ac-button` variants.
- [x] Add shared Landing-compatible compact tokens and remove page-specific button CSS.
- [x] Migrate Landing and remaining Dashboard-specific consumers to `ac-button`.
- [x] Migrate Landing selected toggle to the shared selected/pressed treatment.
- [x] Add focused unit and Playwright parity coverage for representative global controls.
- [x] Run lint, unit tests, build, and shared visual QA in dark and light themes.

## Verification note

The dedicated authenticated `header-button-parity` fixture did not reach the
Dashboard because its pre-existing QA login credentials were rejected by the
production-backed runtime. The public Landing suite, source contract tests,
build, lint, and visual runtime checks pass.
