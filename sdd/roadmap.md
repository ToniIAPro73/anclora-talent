# Roadmap

## Phase 0

Goal: establish the clean-cut platform migration.

- replace Vite with Next.js App Router
- integrate Clerk shell and route protection
- define Neon schema and lazy repository access
- define Blob asset boundary

## Phase 1

Goal: deliver the first authenticated editorial loop.

- login and registration
- dashboard and project creation
- canonical project/document model
- editor, preview and cover routes

## Phase 2

Goal: connect useful inputs and outputs.

- import `txt`
- import `docx`
- upload real cover assets to Blob
- export PDF

## Phase 3

Goal: extend product depth.

- template library
- image placement tools
- EPUB export
- AI editorial assistance
- collaborative workspaces

## Plan de mejora v2 (2026-08, prompt maestro en `sdd/features/`)

Secuencia estricta F0 → F1 (+F1b paralela) → F2 → F3 → F4. Specs por fase en `sdd/features/`.

- **F0 — Productización del motor**: ✅ cerrada 2026-08-04 con fixture real (`feature-f0-productizacion-motor.md`): presupuesto 300 ms verificado (media 1,73 ms) y demo de salida en gate automatizado.
- **F1 — EPUB propio + pre-flight por canal** (KDP/IngramSpark/Kobo). EPUBCheck en CI. ✅ cerrada 2026-08-04 (`feature-f1-epub-preflight.md`): EPUBCheck 0 errores sobre fixture real, NCX 3 niveles, 14 tablas.
- **F1b — Integración FileStudio (Agente Local)**: ✅ cerrada 2026-08-04 (`feature-f1b-integracion-filestudio.md`): contrato en `sdd/integrations/filestudio/`, cliente en `src/lib/filestudio/`, prototipo portada 3 resoluciones, indicador de modo de procesamiento. Gap: `agent-jobs` + `image:resize` en Agente Local requieren contrato versionado en FileStudio; validación real pendiente en staging.
- **F2 — Plantillas + multi-formato coordinado** (manifiesto versionado con procedencia), OCR de ingesta, historial de versiones del AST. **Adenda dual perfiles**: `BrandProfile` (theme pack → `templateOverrides` del compositor; caso formal Manual Anclora Insights, fixture PDF en `fixtures/`).
- **F3 — IA gobernada sobre el motor** (fixes de violations como diffs, co-autor con gates, procedencia humano/IA, disclosure KDP). **Adenda**: extractor de `StructureProfile` + scaffolding gobernado con confirmación humana (G1-G4; referencia `structure_profile_exito_sin_compania_v2.json`).
- **F4 — Distribución y colaboración** (Gumroad/Hotmart, comentarios por roles, API de salida).

## Delivery principles

- Each sprint must close a vertical slice.
- Auth, project ownership and persistence must be valid on the server, not only in UI.
- Build, lint and tests must remain passing continuously.
