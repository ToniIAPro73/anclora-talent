# SDD Plan: Source Document Fidelity & True Pagination Baseline (v1)

**Feature**: Source Document Fidelity, Explicit Overrides, and True Pagination Baseline
**Status**: APPROVED

---

## Phases & Execution Order

### Phase 1: Source Domain Models & Unit Normalization
- Create canonical `OriginalDocumentStyleProfile`, `SourcePaginationBaseline`, and conversion helpers in `src/lib/projects/source-style-profile.ts` and `src/lib/projects/units.ts`.
- Add unit tests for conversions (twips, half-points, pt, px, inches).

### Phase 2: Deep OOXML Style & Geometry Extraction
- Enhance `src/lib/projects/docx-styles.ts` to inspect `word/styles.xml`, `word/document.xml`, `word/settings.xml`, and section properties.
- Extract page width, height, margins, body typography, alignment (justify/left/center/right), line-height, first-line indent, spacing, and headings (h1-h4).
- Add fixture-backed tests for extraction.

### Phase 3: Explicit Brand and Reference Binding Isolation
- Update `resolveBrandProfileId` in `src/lib/projects/composition.ts` so brand is never applied to unconfigured projects.
- Update project creation & import pipeline to ensure fresh imports have `brandProfileId: null` and `referenceEditorialProfile: null`.
- Add tests for brand & reference isolation.

### Phase 4: Style Engine Source Layer Integration
- Update `src/lib/style-engine/model.ts` to include `OriginalDocumentStyleProfile` in `CompileDocumentOptions`.
- Update `src/lib/style-engine/cascade-resolver.ts` to insert `sourceStyleProfile` right above `SYSTEM_DEFAULTS` and beneath explicit Brand/Reference/Overrides.
- Update `src/lib/style-engine/document-compiler.ts` to pass `sourceStyleProfile` and generate CSS variables (`--talent-body-align`, etc.).
- Fix all TypeScript test mocks.

### Phase 5: DocumentDataModal Source / Override Model
- Redesign `DocumentDataModal.tsx` state to handle SOURCE, OVERRIDES, and EFFECTIVE layers.
- Provide per-property and full-document reset functionality.
- Ensure pre-create and project modes persist overrides without overwriting the source profile.

### Phase 6: Chapter Editor & Preview Alignment
- Pass `documentStyleMap` and `compiledCssVariables` from `ProjectWorkspace` to `ChapterEditorFullscreen` and `AdvancedRichTextEditor`.
- Ensure text-align (justify), margins, line-height, and font families apply accurately to the editable canvas and `MultipageFlow`.
- Verify Preview and Export consistency.

### Phase 7: Source Pagination Baseline & Hash Tracking
- Implement pagination baseline calculation with canonical content hashing and validity checking.
- Invalidate baseline upon content edits or visual overrides; restore validity when overrides are cleared over unmodified content.

### Phase 8: Comprehensive Tests & Verification
- Unit & integration tests for all phases.
- Quality gates: TypeScript (`npx tsc --noEmit`), Vitest (`npm run test:run`), lint, and build.
