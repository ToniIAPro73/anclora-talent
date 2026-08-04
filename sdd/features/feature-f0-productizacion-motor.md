# Fase 0 — Productización del motor (plan de mejora v2)

Cerrada: 2026-08-04. Rama `development`. Prompt: `sdd/features/prompt_maestro_implementacion_anclora_talent.md`.

## Entregables

1. **Onboarding guiado del workspace** — `src/components/projects/WorkspaceOnboarding.tsx`: modal 3 pasos (revisa sin miedo → nunca más un índice desactualizado → publica sin rechazos), patrón `ac-modal` (MODAL_CONTRACT), dismiss persistido en localStorage `anclora-workspace-onboarding-v1`. Presets `default/print/digital` con copy de beneficio + descripción corta (`rulesPreset*Desc`).
2. **Telemetría de recomposición** — `useDocumentComposition` mide cada recompose (`performance.now`), log `[anclora:recompose]`, últimas 20 mediciones; contador + última duración en `DocumentHealthPanel` (`healthTelemetrySummary`). Test de presupuesto <300 ms en `src/lib/compose/compose.perf.test.ts` sobre fixture real `fixtures/exito_sin_compania.docx` (46 págs, 4 H1/12 H2/42 H3, 14 tablas): `describe.skipIf` hasta que el dueño coloque el fixture; pipeline real de importación + `createHeuristicMeasurer`, media de 5 recomposiciones incrementales.
3. **Cierre de deuda** —
   - Undo de diffs: store de sesión `advanced-chapter-editor/last-chapter-save.ts` (solo último guardado, sin historial persistente); banner "Revertir" en `DocumentHealthPanel` que re-guarda el HTML previo vía `saveChapterContentAction` (misma ruta de datos). Revert restaura contenido, conserva título.
   - Cover studio: auditado — `surface-metadata-sync.ts` ya es metadata-first en todos los campos con contraparte en `DocumentMetadata`; sin fix necesario. `authorBio` sin contraparte en el modelo (documentado en `back-cover-surface-resolver.ts:59`).
4. **Tests de contrato** — 31 nuevos (40→71 en lib/compose): TOC generado (profundidad `tocDepth`), refs vivas, equivalencia `composeIncremental ≡ compose`, violaciones nunca silenciadas, `resolveDocumentRules` (merge leaf-by-leaf, overrides falsy), `formatPageNumber` romanos. Bug real corregido: millares romanos en `formatPageNumber` (`rules.ts`).

## Commits

- `1152867` feat(f0): onboarding guiado del workspace y presets con copy de beneficio
- `0737826` fix(compose): formatPageNumber renderiza millares romanos (1994 -> mcmxciv)
- `dc37551` test(f0): contrato ampliado de compose, preview-adapter y rules
- `cb301e7` feat(f0): telemetría de recomposición con presupuesto 300ms sobre fixture real
- `843a2db` feat(f0): undo de diffs de recomposición en live preview

## Desviaciones (R8: ganó el código)

- `ComposeViolation` no tiene campo severidad; contrato blinda `rule`/`page`/`blockId`.
- Tabla de prioridades de `resolveDocumentRules` es de un nivel (defaults < partial); preset < overrides vive en UI.
- Banner revert visible con cualquier snapshot revertible de sesión (alcance conservador).
- Baseline tsc del repo: 92 errores preexistentes en `Archive/` y tests antiguos; criterio aplicado = cero errores nuevos.
- Presupuesto 300 ms y demo de salida quedan pendientes de que el dueño coloque `fixtures/exito_sin_compania.docx` (el test se auto-activa).

## Pendiente para cierre formal del hito

- Colocar `fixtures/exito_sin_compania.docx` → correr `compose.perf.test.ts` y demo: añadir párrafo en "La paradoja del éxito solitario", índice H1-H3 y paginación se actualizan solos, 14 tablas intactas (keepTogether).
