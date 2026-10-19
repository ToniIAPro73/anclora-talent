# Recaptura del manual de usuario — Anclora Talent

Documento operativo actualizado el 2026-10-19 (CHG-0015). Fuente de verdad: `docs/manual/screenshots.manifest.json`.

## Estado actual

| CURRENT | STALE | PLACEHOLDER | STATIC |
| ---: | ---: | ---: | ---: |
| 13 | 0 | 0 | 1 |

- **CURRENT**: la UI capturada corresponde al sistema de workspaces v2 vigente en `development` (paleta `#4A9FD8`, raíl de 8 pasos `1 Contenido` .. `8 Exportar`, Cover Studio unificado `08A–09`, modal `Datos del documento` y exportación gobernada).
- **STALE**: la UI cambió después de la captura; pendiente de recaptura real (no se parchea).
- **PLACEHOLDER**: imagen de relleno o ausente; pendiente de captura real.
- **STATIC**: asset de marca del documento; no se captura.

## Reglas QA-safe

- Solo la identidad QA persistente definida en `.anclora/PRODUCTION_RUNTIME.md`; nunca la cuenta personal ni cuentas operativas.
- El ejecutor **no siembra, no crea y no borra datos**: navega y fotografía. Reutiliza los datos QA existentes (`QA_REUSE=true`).
- Las pantallas `assisted` las prepara el operador dentro de la cuenta QA; cualquier acción con escritura se hace solo sobre datos QA.
- Trabajo y commits en `development` (el script se niega a ejecutarse en otra rama).

## Requisitos

1. Dependencias del repo instaladas (`npm ci`) y Chromium de Playwright (`npx playwright install chromium`) o el renderizador A4 integrado en `scripts/generate-manual-pdf.mjs`.
2. Variables en `.env.local` (no versionado): `MANUAL_QA_EMAIL`, `MANUAL_QA_PASSWORD`, `MANUAL_QA_PROJECT_ID`, `MANUAL_QA_EMPTY_EMAIL`, `MANUAL_QA_EMPTY_PASSWORD`. Opcional `MANUAL_APP_URL` (por defecto `http://localhost:3000`).
3. Datos QA necesarios: Proyecto QA existente de la cuenta QA (`MANUAL_QA_PROJECT_ID`) con capítulos, portada y contraportada; documento sintético para la importación asistida; segunda identidad QA `@anclora-talent.test` sin proyectos para el dashboard vacío.

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
| `logo.png` | STATIC | static | - | — | Logo Premium de portada (actualizado). |
| `landing-dark.png` | CURRENT | auto | guest | / | Landing actual de Anclora Talent en tema oscuro (sección «1. Empieza aquí») |
| `sign-up-current.png` | CURRENT | auto | guest | /sign-up | Formulario actual de registro (sección «Crear una cuenta») |
| `sign-in-current.png` | CURRENT | auto | guest | /sign-in | Formulario actual de inicio de sesión (sección «Iniciar sesión») |
| `recovery-current.png` | CURRENT | auto | guest | /forgot-password | Pantalla actual de recuperación de contraseña (sección «Recuperar la contraseña») |
| `dashboard-dark.png` | CURRENT | auto | qa | /dashboard | Dashboard v2 con proyectos, controles globales y Actividad reciente (sección «3. Dashboard y proyectos») |
| `dashboard-empty-light.png` | CURRENT | assisted | qa_empty | /dashboard | Cuenta QA sin proyectos — Dashboard vacío v2 (sección «Dashboard vacío») |
| `workspace-editor.png` | CURRENT | auto | qa | /projects/${MANUAL_QA_PROJECT_ID}/editor | Workspace editorial v2 con raíl de 8 pasos, lista de capítulos, vista previa central y panel Estructura (sección «5. Workspace editorial») |
| `import-analysis.png` | CURRENT | assisted | qa | /projects/new | Pantalla de Nuevo proyecto v2 de 4 bloques con Resumen del proyecto sticky (sección «4. Crear o importar un proyecto») |
| `cover-studio.png` | CURRENT | auto | qa | /projects/${MANUAL_QA_PROJECT_ID}/editor?step=3 | Cover Studio 08A v2 en Paso 3 Portada con datos sintéticos (sección «9. Portada y contraportada») |
| `back-cover.png` | CURRENT | auto | qa | /projects/${MANUAL_QA_PROJECT_ID}/editor?step=4 | Estudio de Contraportada v2 en Paso 4 (sección «9. Portada y contraportada») |
| `preview-full.png` | CURRENT | auto | qa | /projects/${MANUAL_QA_PROJECT_ID}/preview | Preview paginada v2 con portada, controles de dispositivo y lanzamiento de Vista previa avanzada (sección «10. Preview y validación de lectura») |
| `exports.png` | CURRENT | assisted | qa | /projects/${MANUAL_QA_PROJECT_ID}/editor?step=8 | Workspace Exportar v2 en Paso 8 con Formatos de salida, Configuración y Comprobación final (sección «11. Exportación y paquetes de salida») |
| `mobile-editor.png` | CURRENT | auto | qa | /projects/${MANUAL_QA_PROJECT_ID}/editor | Editor de capítulos v2 en viewport compacto/móvil (sección «12. Trabajar en móvil y tablet») |
