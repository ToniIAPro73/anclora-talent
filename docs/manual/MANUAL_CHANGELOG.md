# Manual de usuario - registro editorial

Fecha de actualización: 19 de octubre de 2026 (CHG-0015). Documento de trazabilidad del manual; no es una auditoría técnica ni una certificación de despliegue.

## Versión y alcance (v2.0)

- MANUAL_PREVIOUS_VERSION: 1.0 (11 de septiembre de 2026).
- MANUAL_NEW_VERSION: 2.0 (19 de octubre de 2026).
- VERSION_CHANGE_REASON: actualización integral del manual y sus capturas al sistema de workspaces v2 (`00` Dashboard, `00b` Nuevo proyecto en 4 bloques con Resumen sticky, raíl editorial de 8 pasos `1 Contenido` .. `8 Exportar`, 6 pestañas de Contenido, Editor de capítulos a pantalla completa, Cover Studio y Contraportada unificados `08A–09`, Colaboración, Asistente IA gobernado con declaración Amazon KDP y Exportación con verificación en cliente).
- Markdown canónico: `docs/manual/manual-usuario.md`.
- PDF derivado: `public/manuals/anclora-talent-manual-usuario-es.pdf`.
- Generador: `scripts/generate-manual-pdf.mjs`.
- Manifiesto de capturas: `docs/manual/screenshots.manifest.json` (`version: 2`, `change: "CHG-0015"`, `CURRENT: 13`, `STATIC: 1`, `STALE: 0`).
- Idioma: español.
- Tema visual dominante: dark (`#4A9FD8`), coherente con el tema predeterminado de Anclora Talent.
- Datos de demostración: sintéticos (`E2E Auth Bot`, `Anclora E2E QA`, `La atención deliberada`); no se capturaron cuentas personales ni contenido real de usuarios.

## Cambios principales en v2.0 (2026-10-19)

1. **Navegación y shell v2**:
   - Documentación de los controles globales del encabezado (**Dashboard**, **Nuevo proyecto**, **Vista previa**, **Datos del documento**, selector de idioma **ES / EN**, conmutador de tema y menú de cuenta).
   - Documentación del nuevo raíl de progreso de 8 pasos (**1 Contenido**, **2 Capítulos**, **3 Portada**, **4 Contraportada**, **5 Vista previa**, **6 Colaborar**, **7 Asistente IA**, **8 Exportar**) y de los enlaces directos por query (`?step=1..8`, `?documentData=open`).
2. **Creación e importación de proyectos (`00b`)**:
   - Actualización del flujo `/projects/new` con sus 4 bloques numerados (**1 Proyecto**, **2 Documento base**, **3 Estilo editorial**, **4 Identidad de marca**) y la tarjeta lateral **Resumen del proyecto** con indicador **Listo para crear**.
   - Soporte documentado para manuscritos `.docx`, `.doc`, `.odt`, `.pdf`, `.txt` y `.md`.
3. **Paso 1 — Contenido (6 pestañas) y modal Datos del documento**:
   - Documentación de **Resumen**, **Metadatos**, **Composición**, **Marca**, **Reglas** y **Versiones**, así como del modal contextual **Datos del documento**.
4. **Paso 2 — Capítulos y Editor de capítulos a pantalla completa (`07` / `07b`)**:
   - Documentación del listado de capítulos, vista previa central y panel derecho **Estructura / Salud del capítulo**, más el editor a pantalla completa con selector de dispositivo, zoom, esquema lateral y herramientas tipográficas.
5. **Pasos 3 y 4 — Portada y Contraportada (`08A–09`)**:
   - Documentación de la superficie unificada de diseño de cubierta con 7 paneles laterales (**Elementos**, **Texto**, **Imágenes**, **Formas**, **Líneas**, **Iconos**, **Fondos**), plantillas editoriales, lienzo `400 × 600 px`, avisos de resolución 300 DPI y gestión de capas.
6. **Pasos 5, 6, 7 y 8 — Vista previa, Colaborar, Asistente IA y Exportar (`10–13`)**:
   - Documentación del visor de lectura paginado y la **Vista previa avanzada** (Página simple / Doble página).
   - Documentación del espacio **Colaborar** (comentarios por capítulo, checklist de revisión y compartición) y del **Asistente IA** gobernado con propuestas auditables y declaración automática de contenido IA para Amazon KDP.
   - Documentación del workspace **Exportar** en 3 columnas (**Formatos de salida**: PDF, EPUB, DOCX, HTML, Markdown; **Configuración**; **Comprobación final**), barra **Listo para exportar / Requiere atención** y verificación del archivo descargado en el navegador.
7. **Capturas y PDF A4**:
   - Actualización de las capturas `landing-dark.png`, `dashboard-dark.png`, `dashboard-empty-light.png`, `import-analysis.png`, `workspace-editor.png`, `cover-studio.png`, `back-cover.png`, `preview-full.png`, `exports.png`, `mobile-editor.png` y `project-modal.png` a partir de la evidencia QA sintética v2 verificada.
   - Regeneración en dos pasadas de `public/manuals/anclora-talent-manual-usuario-es.pdf` y actualización de `docs/manual/screenshots.manifest.json` y `docs/manual/RECAPTURE.md` con estado `CURRENT`.

## Historial de versiones

| Versión | Fecha | Cambio | Resumen |
| --- | --- | --- | --- |
| `1.0` | `2026-09-11` | Creación inicial | Primer manual oficial de usuario en español (26 páginas A4, 16 secciones). |
| `1.1` | `2026-09-25` | `CHG-0014` | Actualización de paleta `#4A9FD8`, capturas de acceso y manifiesto de recaptura. |
| `2.0` | `2026-10-19` | `CHG-0015` | Actualización integral al sistema de workspaces v2 (`00`–`13`), capturas v2 (`CURRENT`) y regeneración del PDF A4. |

## Manual Gate (v2.0)

| Criterio | Resultado |
| --- | --- |
| MANUAL_MARKDOWN_EXISTS | PASS |
| MANUAL_CHANGELOG_EXISTS | PASS |
| SCREENSHOTS_DIRECTORY_EXISTS | PASS |
| SCREENSHOT_PLAN_COMPLETE | PASS |
| SCREENSHOTS_CURRENT | PASS (`13 CURRENT`, `1 STATIC`, `0 STALE`) |
| SCREENSHOTS_SYNTHETIC_DATA_ONLY | PASS |
| PRODUCT_BEHAVIOR_VERIFIED | PASS |
| USER_JOURNEYS_COMPLETE | PASS |
| TROUBLESHOOTING_PRESENT | PASS |
| FAQ_PRESENT | PASS |
| GLOSSARY_PRESENT | PASS |
| PDF_GENERATOR_EXISTS | PASS |
| PDF_GENERATION | PASS |
| TOC_VALIDATION | PASS |
| IMAGE_VALIDATION | PASS |
| TEXT_EXTRACTION | PASS |
| VISUAL_VALIDATION | PASS |
| NO_TRUNCATION | PASS |

Resultado del MANUAL_GATE: PASS.
