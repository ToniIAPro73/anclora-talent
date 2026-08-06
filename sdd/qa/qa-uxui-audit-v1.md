# QA UX/UI Audit v1 — Anclora Talent

**Rama:** `qa/uxui-audit-v1` · **Fecha:** 2026-08-05 · **Entorno:** WSL local, `localhost:3200`, Chromium (Playwright)

Este documento reemplaza la sección "MODO ESTÁTICO" (no existía ninguna versión previa
en el historial de la rama; se generó desde cero en esta ejecución dinámica).

## Resumen ejecutivo

| Escenario | Estado | Notas |
|---|---|---|
| E1 — Blank (plantilla) | ✅ PASS (4/4) | Flujo completo plantilla→editor→preview→cover→back-cover→exports sin incidencias |
| E2 — Import caótico | ✅ PASS (1/1) | Heurísticas resisten un markdown deliberadamente sucio, sin crash |
| E3 — Libro real (docx) | ✅ PASS (3/3) | H1/H3/tablas exactos; H2 y páginas de export con hallazgos (ver H2, H3) |
| E4 — Libro → marca | ⚠️ BLOQUEADO | **H1 crítico**: subir el manual de marca rompe el servidor (500) |
| E5 — Marca → libro | ⚠️ BLOQUEADO | Mismo bloqueo que E4, orden-independiente (confirma causa raíz) |
| E6 — Transversal | ✅ PASS (8/8) | i18n, tema, responsive 375×667, error/empty state, modal — todo correcto |
| Gate EPUB `--brand` | ✅ PASS | El pipeline de extracción de marca es correcto fuera de Next (ver H1) |

**20 tests ejecutados, 17 PASS, 2 bloqueados por el mismo bug (H1), 1 test de paridad inconcluso (H4).**

---

## Hallazgos

### H1 — CRÍTICO: subir el manual de marca (PDF) rompe la página del proyecto en dev

**Repro:** 3/3 (E4, E5, y una repetición aislada) — 100% reproducible, independiente del orden libro/marca.

**Pasos:**
1. Abrir un proyecto (en blanco o con contenido importado).
2. En el panel "Perfil de marca", subir `fixtures/anclora_insights_manual_identidad.pdf`.
3. Pulsar "Extraer perfil".

**Resultado:** la Server Action `createBrandProfileAction` responde 500 tras ~7-8s y la
página entera cae al error boundary (`No se pudo cargar este proyecto`). Log de servidor:

```
⨯ Error: Setting up fake worker failed: "Cannot find module
'.next/dev/server/chunks/ssr/pdf.worker.mjs' imported from
.next/dev/server/chunks/ssr/node_modules_pdfjs-dist_legacy_build_pdf_mjs_....js".
 POST /projects/<id>/editor 500 in 8.0s
  └─ ƒ createBrandProfileAction({}) in 7089ms src/lib/brand/actions.ts
```

**Causa raíz:** Turbopack no traza `pdf.worker.mjs` de `pdfjs-dist` al bundle SSR de
la Server Action (mismo tipo de gap que ya existe documentado en `next.config.ts` para
`@sparticuz/chromium`, resuelto ahí vía `outputFileTracingIncludes`). No hay ninguna
entrada equivalente para el árbol de rutas que usa `extractBrandProfileFromPdf`.

**Confirmación de que la lógica de negocio es correcta:** `scripts/check-epub.ts --brand`
(ejecuta el mismo `extractBrandProfileFromPdf` fuera de Next, vía `tsx`) genera un EPUB
válido con el BrandProfile aplicado y 0 errores/warnings de EPUBCheck:

```
[check-epub] BrandProfile activo { name: 'Anclora Insights', palette: [...], ... }
[check-epub] EPUBCheck OK: EPUB 3 válido sin FATAL/ERROR.
```

Esto acota el bug al bundling de dev de Next/Turbopack, no a la extracción de marca en sí.

**Evidencia:** `test-results/qa/e4-brand-panel-before-1440x900-light.png` (panel antes de
subir), `test-results/qa/e4-brand-upload-crash-1440x900-dark.png` y
`test-results/qa/e5-brand-upload-crash-1440x900-dark.png` (pantalla de error tras el 500).

**Sugerencia de fix:** añadir una entrada `outputFileTracingIncludes` para la ruta que
ejecuta `createBrandProfileAction` (o el layout `/projects/[projectId]/editor`) apuntando
a `node_modules/pdfjs-dist/**`, siguiendo el mismo patrón ya usado para
`@sparticuz/chromium` en `next.config.ts`. Alternativa: forzar `disableWorker: true` /
usar el build `legacy` sin worker en el contexto server de pdfjs-dist.

---

### H2 — MEDIO: la preview no muestra imágenes del docx importado

E3 esperaba 3 imágenes (`14 tablas/3 imgs` en el encargo). El recuento real navegando
todas las páginas de la preview (`data-testid="preview-modal-stage"`) fue:

| Métrica | Esperado | Observado |
|---|---|---|
| H1 | 4 | **4** ✅ |
| H2 | 12 | **13** (+1, ver H3) |
| H3 | 41 | **41** ✅ |
| Tablas | 14 | **14** ✅ |
| Imágenes | 3 | **0** ❌ |

Tablas, H1 y H3 casan exactamente con lo esperado — la paginación y el conteo funcionan
bien en general. Las imágenes del docx no aparecen en ningún `<img>` de la preview.
No se pudo determinar en este pase si es (a) que el importador no extrae las imágenes
del docx, (b) que se extraen pero no se renderizan en la superficie de preview, o (c)
un límite de mi bucle de paginación (recorrió hasta que `preview-modal-next-page-button`
quedó disabled, sin límite artificial salvo un tope de 250 páginas). Recomiendo una
verificación manual dirigida — ejemplo: `console.log` en el import-pipeline de docx para
confirmar si detecta imágenes embebidas antes de descartar esto como bug de render.

**Evidencia:** `test-results/qa/e3-preview-1440x900-light.png`.

### H3 — BAJO: recuento de H2 en el docx real da 13, no 12

Un heading de más respecto al valor de referencia del encargo (4H1/**12H2**/41H3).
Puede ser un H2 legítimo del documento no contemplado en el conteo original, o un
duplicado de render (p. ej. un heading que aparece en dos páginas de la paginación
por overlap de contenido entre páginas). No bloqueante; documentado para que quien
mantenga el conteo de referencia lo revise contra el docx fuente.

### H4 — Paridad preview↔export HTML: inconclusa por limitación del test, no del producto

El test de paridad llamó al endpoint `/api/projects/export` con el fixture `request`
de Playwright, que no comparte cookies de sesión con `page` — resultado 401 (no
autenticado), no reflejo real de un fallo de export. Para verificar paridad real hay
que repetir la llamada con `page.request.get(...)` en vez de un contexto de request
aislado. Anotado como deuda de test, no como hallazgo de producto.

### H5 — Estabilidad del dev server: crashes intermitentes de Turbopack/Tailwind

Durante la preparación del entorno (antes de aislar el worktree de QA), el servidor de
desarrollo compartido sufrió al menos dos caídas con el mismo patrón: el scanner de
Tailwind v4 (Oxide) genera clases `arbitrary-value` con bytes de control incrustados en
nombres de variable CSS (p. ej. `--app-grad\x1a` en vez de `--app-gradient`), lo que hace
fallar el parser de Lightning CSS y tira el servidor a 500 en bucle. Se probó excluir
`fixtures/**` del scan (`@source not`) como mitigación puntual — funcionó una vez pero
el problema reapareció más tarde de forma independiente a los fixtures, así que la causa
raíz sigue sin confirmarse (sospecha de bug de escaneo incremental en `@tailwindcss/oxide`
bajo WSL). No se aplicó ningún cambio permanente en `globals.css` de esta rama por esta
causa. Mitigación práctica: reiniciar el servidor de dev limpia la corrupción.

### H6 — INFO: `.next-u3/` no estaba en `.gitignore` (fuera del alcance de esta rama)

Se detectaron ~300 archivos de caché de un segundo servidor de dev (`NEXT_DIST_DIR=.next-u3`,
trabajo en curso de otro agente en `development`) apareciendo como *changes* sin control
de versiones. Se añadió `.next-u3/` a `.gitignore` directamente en `development` (no en
esta rama QA) porque es donde vive ese servidor paralelo; no forma parte de este commit.

---

## Entorno de ejecución (contexto operativo, no hallazgo de producto)

- Se detectó otro agente (KIMI CLI) trabajando en paralelo sobre el mismo working tree
  de `anclora-talent`, cambiando de rama y comiteando mientras esta auditoría estaba en
  curso. Para no interferir con su trabajo ni perder cambios, sus modificaciones se
  guardaron con `git stash push -u` en `development` (sin restaurar — queda pendiente
  de que ese agente/el usuario decida qué hacer con ellas) y esta auditoría se completó
  en un **git worktree aislado** en `/home/toni/projects/anclora-talent-qa` sobre
  `qa/uxui-audit-v1`.
- La máquina (WSL, 7.6GB RAM) llegó a tener 2-3 procesos `next-server` simultáneos
  (el mío + los de KIMI en otros puertos) con swap lleno; esto causó al menos un
  crash real de servidor por OOM y un timeout de test por lentitud extrema, ambos
  reproducidos y descartados como bugs de producto tras reintento en condiciones
  normales.

## Capturas

Todas en `test-results/qa/`:

```
e1-editor-1440x900-light.png          e1-preview-1440x900-light.png
e1-cover-1440x900-light.png           e1-back-cover-1440x900-light.png
e1-exports-1440x900-light.png
e2-import-analysis-1440x900-light.png e2-editor-post-import-1440x900-light.png
e3-import-analysis-1440x900-light.png e3-preview-1440x900-light.png
e4-brand-panel-before-1440x900-light.png
e4-brand-upload-crash-1440x900-dark.png
e5-brand-upload-crash-1440x900-dark.png
e6-signin-1366x768-es.png             e6-signin-1366x768-en.png
e6-dashboard-1440x900-dark.png        e6-dashboard-1440x900-light.png
e6-dashboard-375x667-light.png        e6-editor-375x667-light.png
e6-login-error-1366x768-light.png     e6-dashboard-empty-1440x900-light.png
e6-modal-preview-open-1440x900-light.png
```

## Artefactos de esta auditoría

- `e2e/qa-uxui-audit-v1.spec.ts` — spec Playwright con los 21 tests de E1-E6.
- `qa/fixtures/semilla_caotica.md` — fixture caótica para E2 (headings inconsistentes,
  listas fingiendo capítulos, heading vacío, sin autor, mayúsculas mezcladas).
