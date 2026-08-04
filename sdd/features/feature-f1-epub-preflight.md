# Fase 1 — EPUB propio + pre-flight por canal (plan de mejora v2)

Cerrada: 2026-08-04. Rama `development`. Prompt: `sdd/features/prompt_maestro_implementacion_anclora_talent.md`.

## Entregables

1. **Writer EPUB 3 propio** — `src/lib/epub/epub-writer.ts`: OCF completo (mimetype stored primero, container.xml, OPF Dublin Core desde `DocumentMetadata` con ISBN o uuid estable, NAV XHTML `epub:type toc` + NCX compat, ambos 100% desde `ComposeResult.toc` con niveles reales H1-H3). XHTML por capítulo vía `splitChapters` (export nuevo del motor, sin cambio de lógica) + `blocksToHtml`. Fuentes Liberation TTF empaquetadas (`font/ttf`, PKG-026). Imágenes descargadas a `OEBPS/images/*` con src reescrito. `sanitizeFragmentLinks`: desenvuelve links a bookmarks `_Toc*` inexistentes del DOCX origen (16 errores RSC-012 evitados).
2. **Export EPUB en UI + gate server-side** — route `src/app/api/projects/export/epub/route.ts` (patrón pdf/docx): block+violations → 409; warn → 200 + `x-anclora-gate: warn`; off → 200. Botón EPUB en `ProjectWorkspace` (sustituye placeholder).
3. **EPUBCheck como gate CI** — `scripts/check-epub.ts` genera EPUB desde `fixtures/exito_sin_compania.docx` (pipeline real) y corre EPUBCheck 5.1.0 (jar pineado versión + sha256, temurin 17; npm `epubcheck` descartado por wrapper abandonado). **Resultado local: 0 fatals / 0 errores / 0 warnings**, TOC niveles [1,2,3], NCX `dtb:depth=3`, 14 tablas convertidas. Criterio de salida cumplido a la primera.
4. **Pre-flight por canal** — `src/lib/preflight/preflight.ts`: funciones puras sobre `{document, composed, metadata}` con severidades error/warning/info y ancla a página. KDP (title/author error, ISBN info, language, alt imágenes, fuentes embebibles), IngramSpark (ISBN error, description info, packaging imágenes), Kobo (title/author/language error, alt, saltos de jerarquía headings). UI: chips por canal en `DocumentHealthPanel`; gate de export cuenta solo errores. Mensajes como plantillas ES/EN (`preflightRules`). **0 falsos positivos** sobre fixture con metadata completa; 5 verdaderos positivos tal cual importa (sin author/ISBN/description — real).

## Commits

- `dc6b432` feat(f1): writer EPUB 3 propio desde el compositor
- `3d0f494` feat(f1): export EPUB en UI con gate server-side
- `3cab316` ci(f1): EPUBCheck como gate sobre fixture real
- `58b5dfc` feat(f1): pre-flight por canal (KDP, IngramSpark, Kobo) en health panel

## Desviaciones (R8: ganó el código)

- Cambios en motor: solo `export` de `ChapterSlice`/`splitChapters` y parámetro opcional `templateOverrides` en adapter (EPUB fuerza `tocDepth: 3`); lógica intacta, tests de contrato verdes sin tocar.
- Baseline tsc real: 77 errores preexistentes (no 92 como se estimó en F0).
- Header `x-anclora-gate: warn` solo con violaciones presentes (coherente con cliente).
- Fixture real: 41 secciones H3 (plan decía 42), sin author/ISBN/description en metadata importada.
- Sangrado/trim y 300dpi de IngramSpark: fuera de alcance cliente, documentado sin check (conservador: mejor sin check que falso positivo).

## Verificación de cierre

- Suite completa: 594 tests verdes (97 archivos). Build ok. CI development verde incluyendo gate EPUBCheck.
- Promote F0+F1 a staging/production/main ejecutado por el dueño vía workflows (fix previo: `4162d9e`/`987f312` Chromium en workflows de promote).

## Pendiente (F1b)

- Cliente FileStudio en `src/lib/filestudio/` + pairing/consent UI + webhook + prototipo portada 3 resoluciones (contrato ya documentado en `sdd/integrations/filestudio/`).
