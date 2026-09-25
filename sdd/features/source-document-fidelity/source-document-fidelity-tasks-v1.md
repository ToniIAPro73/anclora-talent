# SDD Tasks: Source Document Fidelity & True Pagination Baseline (v1)

**Feature**: Source Document Fidelity, Explicit Overrides, and True Pagination Baseline
**Status**: IN PROGRESS

---

- [ ] **TASK-01**: Define unit normalization module (`src/lib/projects/units.ts`) and unit tests.
- [ ] **TASK-02**: Define `OriginalDocumentStyleProfile` and `SourcePaginationBaseline` types in `src/lib/projects/source-style-profile.ts`.
- [ ] **TASK-03**: Implement deep OOXML style & layout extraction in `src/lib/projects/docx-styles.ts`.
- [ ] **TASK-04**: Add DOCX style extraction tests covering margins, justification, headings, inheritance, and units.
- [ ] **TASK-05**: Audit and fix brand & reference isolation in `src/lib/projects/composition.ts` and `src/app/api/projects/import/route.ts`.
- [ ] **TASK-06**: Integrate `OriginalDocumentStyleProfile` into style-engine (`model.ts`, `cascade-resolver.ts`, `document-compiler.ts`).
- [ ] **TASK-07**: Update style-engine tests and resolve all TypeScript errors.
- [ ] **TASK-08**: Update `DocumentDataModal.tsx` to handle Source, Overrides, and Effective values with reset controls.
- [ ] **TASK-09**: Connect `documentStyleMap` and CSS variables from `ProjectWorkspace` into `ChapterEditorFullscreen` and `AdvancedRichTextEditor`.
- [ ] **TASK-10**: Ensure Chapter Editor, Preview, and Export render justified text and source margins consistently.
- [ ] **TASK-11**: Implement `SourcePaginationBaseline` generation and validity tracking in `src/lib/projects/source-pagination.ts`.
- [ ] **TASK-12**: Add comprehensive integration tests covering IMPORT, CASCADE, PAGINATION, and DATA requirements.
- [ ] **TASK-13**: Run local quality gates (`tsc`, `test:run`, `lint`, `build`, `git diff --check`).
