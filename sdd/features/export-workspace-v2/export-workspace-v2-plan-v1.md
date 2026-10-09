# Export Workspace v2 — Plan v1

1. `src/lib/projects/export-workspace.ts`: formats, availability from capabilities, per-format
   gate, query override, file names, page summary — unit-tested.
2. `src/lib/projects/export-artifact.ts`: client-safe artifact validation (PDF/DOCX/EPUB/HTML/MD)
   with JSZip — unit-tested with real generated fixtures.
3. i18n `exWs*` (ES/EN); CSS `.ew-*`.
4. `src/components/projects/export-workspace/`: `ExportWorkspace` (state), `FormatList`,
   `ConfigPanel`, `FinalCheck`, action bar + result.
5. Mount in `ProjectWorkspace` step 8 (no rail), keep KDP/launch/channels panels.
6. Tests: model, artifact, component, Playwright with real artifact validation.
7. Gates, commits.
