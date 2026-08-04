# Integración FileStudio — Overview

Anclora Talent consume Anclora FileStudio como API de conversión multi-formato
local-first. Talent sigue siendo responsable de la identidad del usuario, el
modelo de documento, la composición y el estado de producto visible; FileStudio
ejecuta conversiones y post-proceso de archivos.

Identidad de Talent como consumidor (campos `AgentJobRecord` de FileStudio):

- `requestingOrg: "anclora"`
- `requestingApp: "anclora-talent"`

## Qué se delega a FileStudio

| Operación | Uso en Talent |
|---|---|
| Post-proceso PDF | merge/split/reordenar/rotar del PDF exportado; imágenes → PDF |
| Imágenes a 3 resoluciones | derivados de portada e imágenes de contenido (Sharp) |
| Formatos legacy MOBI/AZW3 | conversión de salida vía Calibre para canales legacy |
| OCR de ingesta | texto de PDFs escaneados en importación (Tesseract/Poppler, máx. 50 páginas) |
| Audio/vídeo ligero | extracción de audio, normalización, recorte, thumbnails para cursos (FFmpeg) |

## Qué NO se delega

- **EPUB primario**: lo genera el exportador propio de Talent (F1).
- **Composición y paginación**: motor de composición de Talent (FASE C).
- **AST / modelo semántico**: `src/lib/document/` es la única fuente de verdad.

Frontera de responsabilidad: **Talent compone; FileStudio convierte y
post-procesa.** FileStudio nunca recibe el AST ni reglas de composición; recibe
archivos ya materializados (o fuentes de ingesta) y devuelve archivos.

## Piezas del contrato

- `api-flow.md` — ciclo de vida de trabajos.
- `authentication.md` — scopes y pairing del Agente Local.
- `webhook-flow.md` — receptor de eventos en Talent.
- `routing-policy.md` — selección de modo de procesamiento.
- `error-mapping.md` — errores FileStudio → UX Talent.
- `exclusions.md` — exclusiones explícitas de alcance.
- `hardening.md` — reclasificación de FileStudio a infraestructura de producto.

Referencia de implementación de cliente (solo lectura, como patrón):
`docs/integrations/anclora-nexus/example-integration.ts` en el repo FileStudio.
