# Export Workspace v2 — Specification v1

## Scope

Replace Step 8 (`Exportar`) — a row of five equal buttons, a global "everything blocked" gate
and a vertical stack of panels — with the final publishing workspace of
`docs/mockups/workspace-system-v1/13-export-v1.png`: formats (left), format-specific
configuration (centre), final check (right), readiness bar + one primary action (bottom).

No second export engine: the five existing routes (`/api/projects/export` HTML, `/pdf`,
`/docx`, `/epub`, `/markdown`), `getProjectCapabilities`, `buildExportQueryString`,
`resolveExportPaginationConfig`, `preflight()`, the composition violations, the KDP
disclosure and the builders' own `assertExportArtifactIntegrity` are reused unchanged.

## Audit matrix

| Format | Route | Capability | Current UX | Decision |
| --- | --- | --- | --- | --- |
| HTML | `/api/projects/export` | `canExportHtml` | `window.open`, no feedback | selectable card, validated download |
| PDF | `/api/projects/export/pdf` (editable: composed; fixed PDF: original bytes) | always (`canExportOriginalPdf`) | `PdfExportButton` + `alert()` on error | card + page-size/margins summary; fixed PDF = "Descargar PDF original" |
| DOCX | `/docx` | `canExportDocx` | `window.open` | card, editable-format disclaimer |
| EPUB | `/epub` (server gate: 409 on violations when `exportGate=block`) | `canExportEpub` | `window.open` | card, reflowable explanation, no print controls |
| Markdown | `/markdown` | `canExportMarkdown` | `window.open` | card, structured-text explanation |
| Editable copy | server action | `canCreateEditableCopy` | button | kept, offered with the reason formats are off |
| KDP disclosure | `KdpDisclosurePanel` | — | inside the step | kept (Uso de IA) |
| Launch pack / channels | panels | — | inside the step | kept in a collapsible section |

## Format-specific gating

Today `exportBlocked` disables every format when `exportGate=block` and any violation/error
exists. New rule (same inputs, same `exportGate` policy):

- composition violations (page layout) block **PDF and EPUB** (EPUB: the server already refuses);
- preflight **errors** block by channel: `kdp.*` → PDF, EPUB, DOCX; `ingram.*` → PDF, EPUB; `kobo.*` → EPUB;
- HTML and Markdown are never blocked by the gate;
- warnings/info never block; `exportGate=warn` only warns; `off` ignores.

## Artifact integrity

`HTTP 200 != export passed`. After generating, the client verifies the artifact before offering
it: size > 0, content type, magic bytes and structure (PDF `%PDF-`…`%%EOF`; DOCX `word/document.xml`
with text; EPUB `mimetype`, `META-INF/container.xml`, OPF, navigation, ≥1 chapter; HTML doctype +
closing tag; Markdown non-empty). A failed check shows an actionable error and no download.
The builders' own integrity assertions still run on the server (surfaced as errors).

## Acceptance criteria

1. No legacy rail on Step 8; full-width three-column workspace; stacked on narrow screens.
2. Formats as an accessible radio list with purpose, kind (fixed layout / reflowable /
   editable / text) and availability; unavailable formats show the reason in text; fixed PDF
   offers the original PDF and `Crear copia editable`.
3. Configuration per format showing only settings the builder honours: PDF/DOCX page size
   (export-only `device` override, nothing persisted), margins, typography, cover/back cover,
   page numbering (reference profile); EPUB language, metadata, TOC depth 3, cover note;
   metadata summary (title, author, language, ISBN) with a link to `Datos del documento`.
4. `Comprobación final`: Contenido, Portada, Contraportada, Metadatos, Fuentes, Imágenes
   (partial, as in Step 5), Composición, Uso de IA; only real checks; clickable → the step that
   fixes it; format-specific blockers listed.
5. Readiness bar: `Listo para exportar` / `Requiere atención` with real error/warning counts and
   one primary CTA `Exportar {formato}`; busy state, no double export, accessible status.
6. Success card `Archivo generado` (format, filename, size, validation result, download);
   generated-this-session list (not a persisted history).
7. ES/EN parity; no hard-coded copy.

## Out of scope

Direct KDP/Ingram upload, saved export profiles, bleed/trim, persisted export history,
changing builders/routes, a second metadata editor.
