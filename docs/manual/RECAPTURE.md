# Recaptura del manual de usuario — Anclora Talent

Documento operativo generado el 2026-09-25 (CHG-0014). Fuente de verdad: `docs/manual/screenshots.manifest.json`.

## Estado actual

| CURRENT | STALE | PLACEHOLDER | STATIC |
| ---: | ---: | ---: | ---: |
| 0 | 13 | 0 | 1 |

- **CURRENT**: la UI capturada sigue vigente; solo se actualizó el branding.
- **STALE**: la UI cambió después de la captura; pendiente de recaptura real (no se parchea).
- **PLACEHOLDER**: imagen de relleno o ausente; pendiente de captura real.
- **STATIC**: asset de marca del documento; no se captura.

## Reglas QA-safe

- Solo la identidad QA persistente definida en `.anclora/PRODUCTION_RUNTIME.md`; nunca la cuenta personal ni cuentas operativas.
- El ejecutor **no siembra, no crea y no borra datos**: navega y fotografía. Reutiliza los datos QA existentes (`QA_REUSE=true`).
- Las pantallas `assisted` las prepara el operador dentro de la cuenta QA; cualquier acción con escritura se hace solo sobre datos QA.
- Trabajo y commits en `development` (el script se niega a ejecutarse en otra rama).

## Requisitos

1. Dependencias del repo instaladas (`npm ci`) y Chromium de Playwright (`npx playwright install chromium`).
2. Variables en `.env.local` (no versionado): `MANUAL_QA_PASSWORD`, `MANUAL_QA_PASSWORD`, `MANUAL_QA_PROJECT_ID`, `MANUAL_QA_EMPTY_EMAIL`, `MANUAL_QA_EMPTY_PASSWORD`. Opcional `MANUAL_APP_URL` (por defecto `http://localhost:3000`).
3. Datos QA necesarios: Proyecto QA existente de la cuenta QA (MANUAL_QA_PROJECT_ID) con capítulos, portada y contraportada; documento sintético para la importación asistida; segunda identidad QA @anclora-talent.test sin proyectos para el dashboard vacío.

## Identidades QA por rol

| Rol | Identidad | Variables | Acceso |
| --- | --- | --- | --- |
| `qa` | e2e.auth@anclora-talent.test | `MANUAL_QA_EMAIL` / `MANUAL_QA_PASSWORD` | formulario automático |
| `qa_empty` | valor de `MANUAL_QA_EMPTY_EMAIL` (identidad QA @anclora-talent.test) | `MANUAL_QA_EMPTY_EMAIL` / `MANUAL_QA_EMPTY_PASSWORD` | formulario automático |

## Ejecución (en el Mac)

```bash
# 1. Arrancar la app en una terminal
npm run dev   # Next.js en http://localhost:3000 (base de datos de producción según contrato; este flujo solo lee)

# 2. En otra terminal, desde la raíz del repo
bash scripts/manual/recapture-manual.sh              # todas las capturas pendientes
bash scripts/manual/recapture-manual.sh --auto-only  # solo las automáticas
bash scripts/manual/recapture-manual.sh --only a.png,b.png
node scripts/manual/recapture-manual.mjs --list      # ver el inventario
```

El script comprueba rama, fichero de entorno y que la app responde; captura en `docs/manual/screenshots/`, deja un registro en `tmp/manual-recapture-log.json` y regenera el documento con:

```bash
node scripts/generate-manual-pdf.mjs
```

Documentos que se regeneran: `public/manuals/anclora-talent-manual-usuario-es.pdf`.

Tras revisar capturas y documento: actualiza `status` a `CURRENT` en el manifiesto para las pantallas recapturadas, registra el cambio en el changelog del manual si existe y haz commit en `development`.

## Pantallas

| Archivo | Estado | Modo | Rol | Ruta inicial | Qué capturar |
| --- | --- | --- | --- | --- | --- |
| `logo.png` | STATIC | static | - | — | Logo Premium de portada (ya actualizado). |
| `landing-dark.png` | STALE | auto | guest | / | Landing actual de Anclora Talent en tema oscuro (sección «1. Empieza aquí») |
| `sign-up-current.png` | STALE | auto | guest | /sign-up | Formulario actual de registro (sección «Crear una cuenta») |
| `sign-in-current.png` | STALE | auto | guest | /sign-in | Formulario actual de inicio de sesión (sección «Iniciar sesión») |
| `recovery-current.png` | STALE | auto | guest | /forgot-password | Pantalla actual de recuperación de contraseña (sección «Recuperar la contraseña») |
| `dashboard-dark.png` | STALE | auto | qa | /dashboard | Dashboard con proyecto nuevo y selector de idioma, tema y cuenta (sección «3. Dashboard y proyectos») |
| `dashboard-empty-light.png` | STALE | assisted | qa_empty | /dashboard | Cuenta QA sin proyectos. Cambia a tema claro con el control global antes de capturar. — Dashboard sin proyectos (sección «Dashboard vacío») |
| `workspace-editor.png` | STALE | auto | qa | /projects/${MANUAL_QA_PROJECT_ID}/editor | Workspace editorial con estado del documento y controles de composición (sección «5. Workspace editorial») |
| `import-analysis.png` | STALE | assisted | qa | /dashboard | Con la cuenta QA, importa el documento sintético de QA y deja visible el análisis de importación (nunca documentos reales). — Análisis de importación con datos sintéticos (sección «Pasos de importación») |
| `cover-studio.png` | STALE | auto | qa | /projects/${MANUAL_QA_PROJECT_ID}/cover | Cover Studio con datos sintéticos (sección «Cover Studio») |
| `back-cover.png` | STALE | auto | qa | /projects/${MANUAL_QA_PROJECT_ID}/back-cover | Contraportada del proyecto (sección «Contraportada») |
| `preview-full.png` | STALE | auto | qa | /projects/${MANUAL_QA_PROJECT_ID}/preview | Preview paginada con portada y controles de dispositivo (sección «Preview del proyecto») |
| `exports.png` | STALE | assisted | qa | /projects/${MANUAL_QA_PROJECT_ID}/preview | Desplaza hasta los botones Exportar HTML / PDF / Word y deja visible el bloque de exportación. — Acciones de exportación del proyecto (sección «Antes de descargar») |
| `mobile-editor.png` | STALE | auto | qa | /projects/${MANUAL_QA_PROJECT_ID}/editor | Editor en viewport móvil (sección «12. Trabajar en móvil y tablet») |
