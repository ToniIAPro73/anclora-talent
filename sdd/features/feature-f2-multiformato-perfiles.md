# Fase 2 — Producto compuesto y multi-formato (plan de mejora v2 + adenda dual perfiles)

Cerrada: 2026-08-04. Rama `development`.

## Entregables

1. **Biblioteca de plantillas** — `src/lib/templates/product-templates.ts`: 5 plantillas (libro estándar, manual técnico, guía/lead magnet, curso modular, bundle) = estructura semilla AST + `DocumentRules` + `derivedAssets` declarativos. Selector `ProductTemplateSelector` en creación de proyecto; `projects.template_id` persistido. Cada semilla compone sin errores con TOC generado. (El `TemplateSelector` previo es de portadas — no se tocó.)
2. **Export multi-formato coordinado** — manifiesto versionado `project_asset_manifests` (versión monótona, items con `kind`, `provenance: compositor|filestudio-local|filestudio-service`, `sourceHash`; stale computado en lectura). Writers nuevos: `to-markdown.ts` (AST→MD) y `slides-builder.ts` (HTML slides por capítulo). Acción "pack de lanzamiento": EPUB/PDF/HTML/MD (+slides si la plantilla lo declara) en una operación. UI `LaunchPackPanel`.
3. **FileStudio en el manifiesto** — imágenes 3 resoluciones (`image:resize`), MOBI/AZW3 (`convert-ebook` Calibre, payload verificado contra el código real), provenance `filestudio-service` (Agente Local no registra esas operaciones — declarado). Items delegados entran en la misma versión con `jobId` hasta materializarse.
4. **OCR de ingesta** — PDF escaneado (heurística texto <100 chars) + FileStudio configurado → `pdf:ocr` (Tesseract, ≤50 págs, `spa|eng|spa+eng`) → pipeline premium; modo declarado en UI. Sin flag: import byte-a-byte idéntico.
5. **Historial de versiones** — `document_snapshots` (versión monótona, label/origen, source_hash; retención 50). Captura explícita + auto en reimport/restore. `src/lib/document/diff.ts`: diff por ids estables (added/removed/changed/moved) agrupado por capítulo; restaurar = snapshot nuevo (historia inmutable). UI `HistoryPanel`.
6. **Adenda — BrandProfile (theme pack)** — tabla `brand_profiles` versionada (paleta con roles, pareja tipográfica, proporciones 55/30/10/5, gobernanza y voz jsonb para F3). Mapeo `brandProfileToTemplateOverrides` → PDF/EPUB/HTML vía compositor (R3, nunca representación paralela). Extractor desde `fixtures/anclora_insights_manual_identidad.pdf` con validación determinista: **#0F172A/#F8FAFC/#F59E0B/#D97706 en roles, Baskerville display + Inter body** — reproducible. `scripts/check-epub.ts --brand`: EPUB con marca **0 errores EPUBCheck**. Selector en proyecto (desacoplado, G1).

## Commits

- `397554f`+`307f16c` plantillas + selector · `14bdc63` manifiesto · `c554f06` MD+slides · `2c65222` pack · `ab2db33` delegación FileStudio · `11a1f71` OCR · `e4f3a7c` UI pack · `7cf6e28`+`5273f20` snapshots+diff · `aafa75e`/`7fe4692`/`1938752`/`461d18a`/`8c943f0` BrandProfile

## Desviaciones (gana el código)

- Operación Calibre real: `convert-ebook` (no "mobi"); OCR real: `pdf:ocr` con cap 50.
- **Gap FileStudio**: el worker Service solo ejecuta `data.*` — `image:resize`, `convert-ebook` y `pdf:ocr` hablan el payload acordado pero el despacho engine-side está pendiente en FileStudio (misma clase de gap que F1b, documentado).
- Bundle = un documento con partes-capítulo (modelo plano intacto). `audio-video` del curso sin generador → fuera del pack.
- Fuentes de marca no en disco: PDF mapea Baskerville→Times/Inter→Helvetica (base-14); EPUB/HTML declaran familia de marca con fallback embebido. Portadas conservan su paleta propia.
- Captura de snapshots: explícita + reimport + restore (no por guardado de capítulo) — conservador.

## Criterio de salida

Pack de lanzamiento en una acción con activos versionados y procedencia visible: cumplido (con gaps FileStudio documentados pendientes de su worker).
