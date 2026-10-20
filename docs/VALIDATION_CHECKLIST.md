# Checklist de validación — editor de portada y contraportada: controles compactos (2026-10-20)

> Este fichero se sobrescribe en cada entrega. El historial queda en Git.

**Repositorio:** anclora-talent

**Rama y commit:** development @ b2799ee (cambios de esta tarea en working tree)

**Entorno de validación:** URL de development de Vercel/Worker no declarada (`ANCLORA_CONTRACT_GAP`: faltan `HOSTING_PROVIDER` y `PRODUCTION_DEPLOY_BRANCH`) · `http://localhost:3000`, runtime local

**Datos:** proyecto sintético de QA. Cuenta: `e2e.auth@anclora-talent.test`; nunca la cuenta personal de Toni.

## Actualización de revisión visual (2026-10-20)

- La selección de plantilla permanece en el selector superior. La tarjeta con miniatura de la plantilla activa se eliminó del panel izquierdo para evitar mostrar dos veces la misma composición; se conserva el aviso de confirmación al reemplazar un diseño existente.
- El botón «Importar portada» usa la variante secundaria compacta compartida con la navegación del espacio de trabajo, con esquinas discretas en lugar del radio tipo píldora.
- Los controles de estilo, alineación horizontal y alineación vertical del texto ocupan filas propias; la alineación de cuatro opciones usa cuatro columnas iguales y no se parte en filas irregulares.
- Revisión manual pendiente: aplicar una plantilla con y sin capas, cancelar y confirmar el reemplazo, y comprobar «Importar portada» y la inspectoría de texto en portada y contraportada.

| Comprobación de esta iteración | Comando | Resultado |
| --- | --- | --- |
| Tests de composición de plantilla y panel | `npx vitest run src/components/projects/design-surface/CoverWorkspace08A.test.tsx src/components/projects/design-surface/CoverLayerIndependence.test.tsx src/components/projects/design-surface/AdvancedCoverEditor.test.tsx` | PASS — 51 tests |
| Test de estructura de botón compacto | `npx vitest run src/components/projects/design-surface/CoverWorkspace08A.test.tsx` | PASS — 13 tests |
| TypeScript y ESLint focalizado | `npx tsc --noEmit`; ESLint sobre los componentes y test modificados | PASS |
| Integridad del diff | `git diff --check` | PASS |

## 1. Qué cambia

- Portada y contraportada abren siempre el editor Pro y ya no muestran botones de modo Básico/Pro.
- Importación/exportación JSON y exportación PNG ocupan botones de icono en la barra del editor; PNG usa un icono de salida.
- Deshacer y rehacer son botones de icono en el panel de capas, justo encima de Importar portada.
- Guardar muestra solo el disco, con nombre accesible y tooltip del estado actual.
- El control de mayúsculas pasa a un selector compacto y el campo de zoom se ajusta al valor.
- Se elimina la fila persistente de ayuda JSON para dejar más espacio al lienzo.
- Errores de lectura/validación del archivo no se muestran como errores de guardado.

## 2. Ya comprobado por el agente

| Comprobación | Comando o método | Resultado | SHA |
| --- | --- | --- | --- |
| Pruebas focalizadas | `npx vitest run src/components/projects/design-surface/CoverStudioV2.test.tsx src/components/projects/design-surface/AdvancedCoverEditor.test.tsx src/components/projects/design-surface/CoverWorkspace08A.test.tsx src/components/projects/design-surface/TextLayerProperties.test.tsx` | PASS — 45 tests | b2799ee + working tree |
| TypeScript | `npx tsc --noEmit` | PASS | b2799ee + working tree |
| ESLint focalizado | `npx eslint src/components/projects/design-surface/CoverStudioV2.tsx src/components/projects/design-surface/AdvancedCoverEditor.tsx src/components/projects/design-surface/TextLayerProperties.tsx src/lib/i18n/messages.ts src/components/projects/design-surface/CoverStudioV2.test.tsx src/components/projects/design-surface/AdvancedCoverEditor.test.tsx src/components/projects/design-surface/CoverWorkspace08A.test.tsx src/components/projects/design-surface/TextLayerProperties.test.tsx` | PASS | b2799ee + working tree |
| Integridad del diff | `git diff --check` | PASS | b2799ee + working tree |
| QA visual responsive | `agent-browser`: portada/contraportada, Light/Dark, viewports 390×844, 768×1024 y 1440×1000; capturas en `artifacts/qa/compact-controls/` | PASS; sin desbordamiento horizontal ni botones de modo | b2799ee + working tree |
| Integridad de página | `AGENT_BROWSER_SESSION=cover-compact-controls-qa anclora-visual-qa check http://localhost:3000/projects/d3669015-d372-4e75-9625-6939459e70a3/back-cover` | PASS; contenido y snapshot accesible presentes, sin overlay de error | b2799ee + working tree |
| Exportación JSON | Descarga desde la interfaz y parseo local del fichero resultante | PASS; incluye portada y contraportada | b2799ee + working tree |
| Exportación PNG | Descarga desde la interfaz; lectura de cabecera PNG | PASS; 400×600 px | b2799ee + working tree |
| Error de lectura JSON | Prueba de componente con `File.text()` rechazado | PASS; informa del error sin cambiar el estado de guardado | b2799ee + working tree |

## 3. Pruebas no ejecutadas (NOT_RUN)

| Prueba | Motivo concreto |
| --- | --- |
| Reimportación de JSON desde el navegador | Se intentó cargar el JSON exportado, pero Chromium devolvió “The requested file could not be read”. La importación y el guardado de ambas superficies sí pasan en pruebas focalizadas. |
| Build de producción | No se ejecutó; TypeScript, ESLint, pruebas focalizadas y QA visual cubren este cambio de componentes y estilos. |
| Validación en URL de development | No hay URL declarada porque falta `HOSTING_PROVIDER` y `PRODUCTION_DEPLOY_BRANCH` en el contrato canónico. No se hizo push ni despliegue. |

## 4. Checklist para validar en la aplicación

Marca cada punto. Un fallo en un punto marcado **[BLOQUEANTE]** impide promocionar.

| # | Dónde | Pasos | Resultado esperado | Cuenta o configuración | Bloqueante |
| --- | --- | --- | --- | --- | --- |
| 1 | Portada | Abrir `/projects/<id>/cover`; revisar barra, herramientas y lienzo | No aparecen Básico/Pro; acciones compactas; lienzo con el mayor espacio | Revisión manual de Toni en su sesión | Sí |
| 2 | Contraportada | Abrir `/projects/<id>/back-cover` y revisar las mismas acciones | Misma estructura y tamaños que Portada; paso 4 activo | Revisión manual de Toni en su sesión | Sí |
| 3 | Texto seleccionado | Seleccionar una capa de texto y abrir el control de transformación | Un selector compacto conserva Normal, MAYÚSCULAS y minúsculas | Proyecto de prueba | No |
| 4 | Importación/exportación | Probar importación JSON, exportación JSON y PNG | Los iconos ejecutan la acción correcta; la exportación PNG usa icono hacia fuera | Proyecto de prueba con diseño | Sí |
| 5 | Guardado | Cambiar un elemento y guardar; observar tooltip/estado del disco | Disco solo visualmente; estados de guardado accesibles y correctos | Proyecto de prueba con diseño | Sí |

### Casos negativos y de borde

| # | Caso | Resultado esperado |
| --- | --- | --- |
| 1 | JSON ilegible o inválido | Mensaje de importación; el estado del disco no indica error de guardado si no se intentó guardar |
| 2 | Fallo de persistencia al importar | Se muestra error de guardado y se informa si solo se guardó una superficie |
| 3 | Viewport 390×844, 768×1024 y 1440×1000 | Sin desbordamiento horizontal; controles accesibles y lienzo visible |

### Estados de interfaz afectados

- [ ] Vacío · [x] Cargando · [x] Error · [x] Éxito · [x] Móvil · [x] Escritorio · [x] Modo oscuro

## 5. Riesgos y limitaciones

- La reimportación con el selector de archivos no pudo verificarse en navegador por una restricción de lectura local; la prueba de componente cubre parsing, importación y guardado.
- Falta declarar `HOSTING_PROVIDER` y `PRODUCTION_DEPLOY_BRANCH`; por ello no se identificó ni verificó un destino remoto de development.

## 6. Decisión de Toni

- [ ] Todos los puntos bloqueantes pasan
- [ ] Se promociona: escribir `PROMOTE=FULL` (staging → production → main)
- [ ] No se promociona. Motivo: pendiente de revisión de Toni.
