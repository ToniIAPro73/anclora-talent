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
- **F2 — Plantillas + multi-formato coordinado** (manifiesto versionado con procedencia), OCR de ingesta, historial de versiones del AST. **Adenda dual perfiles**: `BrandProfile` (theme pack → `templateOverrides` del compositor; caso formal Manual Anclora Insights, fixture PDF en `fixtures/`). ✅ cerrada 2026-08-04 (`feature-f2-multiformato-perfiles.md`): 5 plantillas, pack de lanzamiento, BrandProfile con validación determinista, EPUBCheck con marca 0 errores. Gap FileStudio: worker Service solo ejecuta `data.*` (despacho engine pendiente en ese repo).
- **F3 — IA gobernada sobre el motor** (fixes de violations como diffs, co-autor con gates, procedencia humano/IA, disclosure KDP). **Adenda**: extractor de `StructureProfile` + scaffolding gobernado con confirmación humana (G1-G4; referencia `structure_profile_exito_sin_compania_v2.json`). ✅ cerrada 2026-08-04 (`feature-f3-ia-gobernada.md`): contrato extractor exacto sobre fixture, test de no-transferencia de voz, pipeline co-autor con diff aceptable/rechazable.
- **F4 — Distribución y colaboración** (Gumroad/Hotmart, comentarios por roles, API de salida). ✅ cerrada 2026-08-04 (`feature-f4-distribucion-colaboracion.md`): launch kit desde AST, push Gumroad (borrador), export Hotmart, colaboración por roles con sugerencias aceptables. API de salida del compositor: diferida a demanda de beta (decisión del plan).

### Verificación integral con fixtures reales (2026-08-05)

Gates de contrato activados (de skip a PASS) con los fixtures reales ya presentes en `fixtures/` — sin cambios de código ni de expectativas; el extractor y los perfiles cumplen el contrato v2 tal cual:

- Contrato de importación (`extract-structure-profile.contract.test.ts`, 7 tests): 4 H1 / 12 H2 / 41 H3 = 57 headings, 14 tablas, 3 imágenes, distribución subsecciones [2,4,4,4,3,4,4,4,4,4,4,0] (media 3,42), macro-patrón 4 partes con funciones retóricas, enumeración «Concepto N · …», frontera de voz G3 declarada. JSON de referencia `structure_profile_exito_sin_compania_v2.json` reproducido exacto.
- Rendimiento (`compose.perf.test.ts`): recomposición incremental media 1,83 ms (presupuesto 300 ms); incremental ≡ compose completo; TOC H1–H3 regenerado (62 entradas), 14 tablas intactas.
- Scaffolding (`scaffolding.test.ts`): andamiaje 16 capítulos (1 apertura + 4 partes + 11 capítulos), solo placeholders, cero 6-gramas de la fuente (G3). Estable en suite completa paralela.
- Launch kit (`launch-kit.test.ts`, 15 tests): título/subtítulo reales, bullets H2 verbatim, descripción derivada del capítulo 1 marcada como borrador.
- BrandProfile (`extract-brand-profile.test.ts`, 8 tests): 4 hex en roles (ink `#0F172A`, paper `#F8FAFC`, accent `#F59E0B`, accentMuted `#D97706`), Libre Baskerville + Inter, proporción 55·30·10·5, reglas de gobernanza y pares de voz.
- Demo dual perfiles: `scripts/check-epub.ts --brand` → EPUBCheck 0 FATAL/ERROR/warnings, NAV/NCX 3 niveles, EPUB 384 389 bytes; exportes PDF (Baskerville→Times-Bold/Times-Roman, Inter→Helvetica) y HTML (CSS de marca en cascada) cubiertos por `brand-export.test.ts`.
- CI local verde: `lint` 0 errores · `vitest run` 163 archivos / 1058 tests PASS · `next build` OK · `tsc --noEmit` 77 errores baseline (cero nuevos).

Desviaciones: ninguna (R8 no aplicado; código y fixture coinciden con la spec v2).

## Delivery principles

- Each sprint must close a vertical slice.
- Auth, project ownership and persistence must be valid on the server, not only in UI.
- Build, lint and tests must remain passing continuously.
