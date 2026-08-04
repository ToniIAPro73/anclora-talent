# Routing Policy — Modos de procesamiento

Talent decide por operación en qué modo la ejecuta FileStudio. La política
rechaza la operación si no hay consentimiento del usuario; los datos
restringidos requieren aprobación humana explícita.

## Modos

| Modo | Qué es | Uso |
|---|---|---|
| **1 — Agente Local** | Dispositivo del usuario/organización emparejado; procesa en local, sin subir contenido | **Default para contenido sensible**: manuscritos, PDFs de ingesta, cualquier archivo del proyecto |
| **2 — Service API** | Infraestructura privada de FileStudio | **Fallback** cuando el agente está apagado y el usuario acepta explícitamente procesar fuera de su dispositivo |
| **3 — Navegador** | Herramientas browser de FileStudio (imágenes, PDF básico, datos estructurados) | **Operaciones ligeras** sin motor nativo: redimensionar/comprimir imágenes pequeñas, merge/rotate PDF simple |

## Regla de producto innegociable

**Cada operación declara al usuario en qué modo se procesó**, con un indicador
visible en la UI (p. ej. "Procesado en tu dispositivo" / "Procesado en la nube
privada de Anclora" / "Procesado en tu navegador"). No hay degradación
silenciosa entre modos: el cambio de modo respecto al esperado requiere
consentimiento.

## Criterios de selección

| Criterio | Decisión |
|---|---|
| Contenido confidencial (manuscritos, ingesta de proyectos) | Modo 1; nunca Modo 2 salvo opt-in explícito por operación |
| Agente Local apagado u operación no soportada por el agente | Modo 2 si el usuario consiente; si no, el trabajo queda en cola (`hardening.md`) |
| Archivo > umbral de subida del Service API | Modo 1 o rechazo con mensaje |
| Operaciones ligeras de imagen/PDF/datos ≤ 10 MB | Modo 3 si la matriz web de FileStudio cubre la operación |
| OCR, MOBI/AZW3, audio/vídeo | Modo 1 (motores nativos: Tesseract, Calibre, FFmpeg); nunca Modo 3 |

## Metadata que Talent pasa a la política

Clasificación del dato, operación, tamaño, proyecto, consentimiento del
usuario y residencia permitida — el mismo contrato que la política de
referencia de FileStudio para Nexus.
