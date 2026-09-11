# Manual de usuario - registro editorial

Fecha de creación: 11 de septiembre de 2026. Documento de trazabilidad del manual; no es una auditoría técnica ni una certificación de despliegue.

## Versión y alcance

- MANUAL_PREVIOUS_VERSION: NONE.
- MANUAL_NEW_VERSION: 1.0.
- VERSION_CHANGE_REASON: creación del primer manual de usuario oficial en español.
- Markdown canónico: \`docs/manual/manual-usuario.md\`.
- PDF derivado: \`public/manuals/anclora-talent-manual-usuario-es.pdf\`.
- Generador: \`scripts/generate-manual-pdf.mjs\`.
- Idioma: español.
- Tema visual dominante: dark, coherente con el tema predeterminado de Talent.
- Datos de demostración: sintéticos; no se capturaron cuentas personales ni contenido real de usuarios.

## Preflight Git

| Dato | Resultado |
| --- | --- |
| Rama | development |
| CURRENT_HEAD | 8417ae839199d8e96fa4fd026dba3dfe1a15cc59 |
| REMOTE_DEVELOPMENT_HEAD | 8417ae839199d8e96fa4fd026dba3dfe1a15cc59 |
| LOCAL_REMOTE_MATCH | TRUE |
| WORKTREE_STATUS inicial | limpio |
| Fetch | \`git fetch --all --prune\`, completado |
| Historial | \`git log -20 --oneline\`, leído |
| Código funcional modificado | no |

## Fuentes consultadas

### Autoridad actual

- Código actual de \`development\`, especialmente rutas de app, componentes de autenticación, dashboard, proyectos, editor, preview, portada, contraportada y exportación.
- Tests unitarios, de componentes y E2E bajo \`src/\` y \`e2e/\`.
- \`package.json\`, \`playwright.config.ts\`, \`README.md\`, \`AGENTS.md\` y \`.anclora/AOS_ADOPTION.md\`.
- \`sdd/product.md\`, \`sdd/architecture.md\`, \`sdd/data-model.md\`, \`sdd/composition-engine.md\` y \`sdd/roadmap.md\`.
- \`docs/specs/SPEC-TALENT-POST-UX-REAUDIT-END-TO-END.md\`.
- \`docs/roadmap/ROADMAP-TALENT-POST-UX-REAUDIT-END-TO-END.md\` y sus fases P0-P7.
- \`docs/standards/TALENT_COLOR_PALETTE.md\`, contratos de localización y preview.
- \`memory/test_credentials.md\`, usado solo para identificar que existen fixtures E2E sintéticas; no se usaron credenciales personales.

### Referencia metodológica

- \`anclora-shiftimport/docs/manual/manual-usuario.md\`.
- \`anclora-shiftimport/docs/manual/MANUAL_CHANGELOG.md\`.
- \`anclora-shiftimport/scripts/generate-manual-pdf.mjs\`.
- \`anclora-shiftimport/public/manuals/anclora-shiftimport-manual-usuario-es.pdf\`.

ShiftImport se utilizó para estructura, profundidad, trazabilidad, índice de dos pasadas y validación. No se reutilizó contenido funcional.

## Verificación de producto

Se verificó en código y tests:

- landing pública, inicio de sesión, registro y recuperación;
- defaults de idioma español y tema dark;
- dashboard vacío, creación y recuperación de proyectos;
- búsqueda, inventario, paginación y quick switcher;
- workspace, capítulos, orden, editor y herramientas de formato;
- composición, metadatos, salud del documento y versiones;
- Cover Studio, portada y contraportada;
- preview paginada, dispositivos y navegación;
- exportación HTML, Word y PDF;
- flujo EPUB disponible en ruta y capacidades de pack cuando la interfaz lo ofrece;
- soporte de viewport móvil y tablet;
- persistencia de preferencias ES/EN y dark/light;
- mensajes de error y estados de recuperación.

## Capturas

Las capturas públicas \`landing-dark.png\`, \`sign-in-current.png\`, \`sign-up-current.png\` y \`recovery-current.png\` se generaron en el árbol actual de \`development\` mediante servidor local.

Las capturas autenticadas se tomaron del conjunto QA sintético versionado del repositorio, generado por Playwright con nombres \`E1...\`, \`E2...\` y \`E6...\`. Se revisaron visualmente y se contrastaron con el código actual. No se ejecutaron nuevas mutaciones sobre la base de datos ni se utilizaron cuentas personales.

| Archivo | Acción |
| --- | --- |
| \`logo.png\` | ADDED; copia del logo real de \`public/brand/anclora-talent.png\` |
| \`landing-dark.png\` | ADDED; captura local actual |
| \`sign-in-current.png\` | ADDED; captura local actual |
| \`sign-up-current.png\` | ADDED; captura local actual |
| \`recovery-current.png\` | ADDED; captura local actual |
| \`dashboard-dark.png\` | ADDED; captura QA sintética revisada |
| \`dashboard-empty-light.png\` | ADDED; captura QA sintética revisada |
| \`workspace-editor.png\` | ADDED; captura QA sintética revisada |
| \`import-analysis.png\` | ADDED; captura QA sintética revisada |
| \`preview-full.png\` | ADDED; captura QA sintética revisada |
| \`cover-studio.png\` | ADDED; captura QA sintética revisada |
| \`back-cover.png\` | ADDED; captura QA sintética revisada |
| \`exports.png\` | ADDED; captura QA sintética revisada |
| \`project-modal.png\` | ADDED; captura QA sintética revisada |
| \`mobile-editor.png\` | ADDED; captura QA sintética revisada |
| \`sign-in-es.png\`, \`sign-in-en.png\` | ADDED; capturas QA sintéticas de paridad |
| \`login-error.png\` | ADDED; captura QA sintética de recuperación |

Inventario final: 18 imágenes, incluida la copia del logo.

### Plan de capturas

| Archivo | Ruta o superficie | Estado | Perfil | Propósito | Viewport/tema | Datos |
| --- | --- | --- | --- | --- | --- | --- |
| `logo.png` | Marca | Logo real | Todos | Portada del manual | Recurso | Branding versionado |
| `landing-dark.png` | `/` | Landing pública | Visitante | Qué ofrece Talent | 1440×900, dark/ES | Sin cuenta |
| `sign-in-current.png` | `/auth/signin` | Inicio de sesión | Visitante | Acceso | 1440×900, dark/ES | Campos vacíos |
| `sign-up-current.png` | `/auth/signup` | Registro | Visitante | Crear cuenta | 1440×900, dark/ES | Email de ejemplo visible |
| `recovery-current.png` | `/auth/forgot-password` | Recuperación | Visitante | Recuperar acceso | 1440×900, dark/ES | Sin envío |
| `dashboard-dark.png` | Dashboard | Proyecto sintético | Autor recurrente | Workspace e identidad | 1440×900, dark/ES | E2E Auth Bot |
| `dashboard-empty-light.png` | Dashboard | Sin proyectos | Autor nuevo | Estado vacío y creación | 1440×900, light/ES | E2E Empty Bot |
| `workspace-editor.png` | Workspace | Estado editorial | Autor recurrente | Lectura del workspace | 1440×900, light/ES | E2E QA |
| `import-analysis.png` | Nuevo proyecto | Análisis | Importador | Revisar estructura detectada | 1440×900, light/ES | Manuscrito sintético |
| `preview-full.png` | Preview | Vista completa | Autor/exportador | Revisar paginación | 1440×900, light/ES | Proyecto E1 |
| `cover-studio.png` | Cover Studio | Portada | Diseñador | Diseñar portada | 1440×900, dark/ES | Proyecto E1 |
| `back-cover.png` | Contraportada | Contraportada | Diseñador | Completar reverso | 1440×900, dark/ES | Proyecto E1 |
| `exports.png` | Exportar | Acciones de salida | Autor/exportador | Localizar formatos | 1440×900, dark/ES | Proyecto E1 |
| `project-modal.png` | Quick switcher | Modal abierto | Autor con varios proyectos | Recuperación rápida | 1440×900, light/ES | Proyectos E6 |
| `mobile-editor.png` | Editor | Viewport estrecho | Autor móvil | Explicar diferencias móviles | 375×667, light/ES | Proyecto E6 |
| `sign-in-es.png` | `/auth/signin` | Paridad ES | Visitante | Contrastar idioma | 1366×768, ES | Fixture QA |
| `sign-in-en.png` | `/auth/signin` | Paridad EN | Visitante | Contrastar idioma | 1366×768, EN | Fixture QA |
| `login-error.png` | `/auth/signin` | Error | Visitante | Recuperación ante credenciales inválidas | 1366×768, light/ES | Fixture QA |

El Markdown canónico embebe 14 de estos 18 assets. Los cuatro restantes (`sign-in-es.png`, `sign-in-en.png`, `login-error.png` y `project-modal.png`) se conservan como evidencia QA y paridad evaluada; no se fuerzan en el documento cuando duplican o distraen del recorrido principal.

## Limitaciones de validación

- No se ejecutó un login real con una cuenta personal ni con Google.
- No se crearon proyectos ni se modificaron manuscritos en producción.
- Las capturas autenticadas proceden del corpus QA sintético ya versionado; no se volvió a provisionar una cuenta porque el \`.env.local\` local contiene variables de Production.
- La entrega de correo de recuperación se documenta como dependiente de la configuración de Resend del entorno.
- La URL pública del PDF depende del hosting que sirva \`public/\`; debe comprobarse después del despliegue.
- La aplicación no contiene actualmente un enlace visible de Ayuda o Manual en el shell principal. Esto queda registrado como MANUAL_DISCOVERY_GAP y no se corrige en esta misión.

## Validaciones y resultados

- Markdown canónico existe: PASS.
- Referencias de imágenes existentes y cargables: PASS.
- Generador autocontenido con input Markdown: PASS.
- Generación PDF A4 en dos pasadas: PASS; 26 páginas, 4.836.332 bytes.
- PDF no cifrado y texto extraíble: PASS; 25.778 caracteres extraíbles.
- Índice con numeración real: PASS; 16 capítulos detectados en segunda pasada.
- Imágenes y dimensiones: PASS; 18 assets inspeccionados, 14 embebidos.
- Validación visual: PASS; portada, índice, páginas con tablas y capturas, troubleshooting, FAQ y última página revisados.
- Maquetación de impresión: PASS; A4, sin desbordamientos, truncamientos, tablas rotas ni páginas vacías accidentales.
- \`npm run lint\`: PASS; 0 errores y 4 warnings preexistentes/no bloqueantes fuera del manual.
- \`npm run test:run\`: PASS; 184 archivos y 1.153 tests.
- \`npm run build\`: PASS; build de Next.js 16.2.1 completado; queda un warning de trazado NFT ya existente en \`next.config.ts\`.
- Código funcional de Talent modificado: FALSE.

## Manual Gate

| Criterio | Resultado |
| --- | --- |
| MANUAL_MARKDOWN_EXISTS | PASS |
| MANUAL_CHANGELOG_EXISTS | PASS |
| SCREENSHOTS_DIRECTORY_EXISTS | PASS |
| SCREENSHOT_PLAN_COMPLETE | PASS |
| SCREENSHOTS_CURRENT | PASS con capturas públicas del HEAD y corpus QA sintético contrastado con el código actual |
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
| NO_PRODUCT_CODE_MODIFIED | PASS |

Resultado del MANUAL_GATE: PASS.

## Gaps de producto detectados

### MANUAL_DISCOVERY_GAP

No se encontró un enlace visible a este manual dentro del footer, menú de ayuda o Settings actual. El PDF queda disponible como artefacto estático cuando el despliegue sirve \`public/manuals/\`. Añadir un enlace en la aplicación requiere una tarea funcional separada y queda fuera de esta misión.

### PRODUCT_GAP

No se documenta como garantizado ningún proveedor social concreto si la instalación muestra el botón deshabilitado. El manual explica el comportamiento verificable: proveedor activo cuando está configurado; alternativa por email cuando aparece **Próximamente**.

## Cierre

El manual es una guía de usuario, no una traducción de la SPEC. Las instrucciones se han limitado a capacidades visibles o verificadas por código y tests. Cualquier cambio de rutas, labels, formatos de exportación o flujo de autenticación exige revisar esta versión y generar una nueva entrada.
