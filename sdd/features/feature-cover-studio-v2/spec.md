# Feature: Cover Studio v2 — editor de portada/contraportada como diseño por capas

## Objetivo

Sustituir el editor de portada/contraportada actual (`src/components/projects/cover-studio/`,
un mapa de campos fijo — título/subtítulo/autor/cuerpo/bio) por una herramienta de diseño
real ("Canva-lite"): capas arbitrarias posicionables libremente, tipografía completa,
imágenes con filtros no destructivos, fondo (color/degradado/imagen), reglas/guías/snapping,
panel de capas, historial undo/redo, modos Básico y Avanzado sobre el **mismo** modelo de
datos, herencia de la portada original para proyectos `fixed-pdf`, y un único motor de
render compartido por editor, previsualización y exportación.

Este trabajo es una feature independiente: no toca el motor PDF→editable, el parseo
estructural de PDF, Launch Pack, Hotmart/Gumroad, los exportadores EPUB/HTML/Markdown, ni
el dashboard general (todo eso es alcance de la remediación previa, ver
`sdd/features/feature-fixed-pdf-document-mode/`).

## Decisiones arquitectónicas

### 1. Modelo canónico único — `DesignSurface`/`DesignLayer`

`src/lib/projects/design-surface.ts` define el único modelo persistido/editado:

```ts
interface DesignSurface {
  version: 2;
  surface: 'cover' | 'back-cover';
  width: number; height: number;
  background: BackgroundSpec;      // solid | gradient | image
  layers: DesignLayer[];           // text | image | shape, zIndex arbitrario
  safeArea?: SafeAreaSpec;
  isbnArea?: {...};                // solo contraportada, nunca se exporta
  guides?: DesignGuide[];          // nunca se exportan
  originAssetId?: string | null;
  originMode?: 'blank' | 'use-original' | 'edit-original';
  status?: 'draft' | 'final';
}
```

Básico y Avanzado editan el **mismo** objeto (`onChange` controlado por el padre) — nunca
hay dos modelos ni sincronización entre ellos. Un diseño creado/editado en un modo se
conserva exactamente igual al cambiar al otro (regla dura de la misión, §61-62).

Persistencia: se reutiliza la columna JSON genérica `cover_layers` que ya usaba el modelo
legacy `SurfaceState` (`kind: 'surface-state-cover'|'surface-state-back-cover'`) — **no
hay migración de esquema de base de datos**. Un `SurfaceState` v1 se convierte a v2 de
forma perezosa en lectura (`migrateLegacySurfaceState`), nunca de forma eager.

### 2. Motor de canvas interactivo — Fabric.js (decisión de librería, mission §57)

Se auditó la dependencia existente antes de añadir nada: `fabric` 7.2.0 ya estaba en
`package.json`, usado por un motor huérfano y nunca montado
(`src/components/projects/advanced-chapter-editor/ChapterImageCanvas.tsx` +
`src/lib/canvas-utils.ts` + `src/lib/canvas-guides.ts`). Se generalizó ese motor (antes solo
imágenes) a los tres tipos de capa en `src/components/projects/design-surface/DesignSurfaceCanvas.tsx`.
**No se añadió Konva, Moveable ni interact.js** — Fabric ya cubre selección, arrastre,
resize/rotate nativos, multi-selección, y (crítico) tiene un build `/node` que permite
reusar exactamente el mismo motor en el servidor (ver §4).

### 3. `CanvasGuideManager` conectado por primera vez

`src/lib/canvas-guides.ts` (snapping a bordes de canvas/objeto + smart guides) existía
completo pero **nunca estaba conectado** a ningún evento de arrastre en toda la app. Se
conectó a `object:moving`/`object:modified` en `DesignSurfaceCanvas.tsx`, y se extendió con
`setCustomGuides()` para que las guías persistidas por el usuario también sean objetivos
de snapping. Las guías del usuario se renderizan como overlay DOM/CSS puro
(`CanvasOverlays.tsx`), nunca como objetos Fabric — así "las guías nunca se exportan" es
una garantía estructural, no un filtro en el momento de exportar.

### 4. Renderer servidor estructurado — `fabric/node` + `canvas` (decisión del usuario)

Se ofrecieron dos niveles de esfuerzo para el motor de exportación; se eligió el mayor:
un renderer de servidor completo y estructurado, no el patrón anterior de captura de
pantalla cacheada. Verificado empíricamente (spike descartado tras confirmar):
`fabric/node` + `canvas` (node-canvas de Automattic, **no** `@napi-rs/canvas`) renderiza
correctamente texto rotado, formas y filtros de imagen, produciendo un PNG válido vía
`StaticCanvas#toDataURL({format:'png'})`.

`src/lib/projects/design-surface-fabric.ts` hidrata `DesignLayer → objeto Fabric` de forma
agnóstica al entorno (mismo código para `getFabric()` en el navegador y `fabric/node` en el
servidor). `src/lib/projects/design-surface-render.ts` es el único punto de entrada del
renderer estructurado (`renderDesignSurfaceToPng`/`...ToPngDataUrl`).

Bug real detectado por un test contra el `fabric/node` real (no mockeado): el constructor de
`Textbox` ignora una clave `text` pasada en el objeto de opciones — el texto transformado
(mayúsculas/minúsculas) debe pasarse como primer argumento posicional del constructor.

### 5. Un solo motor, tres consumidores

- **Editor interactivo**: `DesignSurfaceCanvas.tsx` (Fabric navegador).
- **Preview no interactivo** (dashboard, modal de vista previa, exportación PDF client-side
  vía `html-to-image`): `src/components/projects/design-surface/DesignSurfaceRenderer.tsx`,
  un componente DOM/CSS puro que lee el mismo `DesignSurface`.
- **Exportación PNG/PDF servidor**: `design-surface-render.ts` (Fabric `/node`).

`export-surface-image.ts`, `PreviewModal.tsx` y `PdfExportButton.tsx` se modificaron con una
rama explícita: si `project.cover.surfaceState`/`project.backCover.surfaceState` ya es v2
(`isDesignSurfaceV2`), se usa el motor nuevo; si es v1/legacy/ausente, se mantiene la
canalización antigua intacta. Ningún proyecto existente cambia de aspecto hasta que su
portada se abre y guarda en el nuevo editor.

### 6. Precedencia de metadatos (bug concreto corregido)

`resolveCoverText()` implementa la cadena exacta pedida por la misión:
`cover-manual > document-metadata > document-field > project-title (rechazando títulos
provisionales como "Mi proyecto") > filename > none`. Test de regresión explícito para el
bug reportado. La acción "Actualizar desde metadatos" (`TextLayerProperties.tsx`,
prop `onSyncFromMetadata`) solo aparece cuando el valor de metadatos difiere del contenido
actual, y siempre pide confirmación antes de sobrescribir.

### 7. Herencia de portada original (fixed-pdf y cualquier proyecto con asset `source-document`)

`src/lib/projects/pdf-page-rasterizer.ts` rasteriza la página 1 (portada) o la última
página (contraportada, usando `document.source.pageCount`) del PDF original, client-side,
vía `pdfjs-dist` — el mismo patrón ya usado por `FixedPdfPreview.tsx`. El archivo original
nunca se lee/modifica en este flujo: solo se genera una imagen derivada que se usa como
fondo (`applyOriginalPageBackground()`). `CoverOriginPrompt.tsx` es el estado vacío
explícito (mission §33-39 y también el requisito general de "nunca generar una portada
genérica en silencio"): Usar original / Editar como base / Elegir plantilla / Empezar en
blanco.

### 8. Acciones destructivas siempre confirmadas

- "Restablecer a la portada original" (`AdvancedCoverEditor`) — solo visible si
  `originAssetId` existe, pide `window.confirm` (mismo patrón ya usado en
  `ProjectDeleteButton.tsx`/`ProjectCardMenu.tsx`).
- Aplicar una plantilla sobre un diseño no vacío (`BasicCoverEditor`) — pide confirmación;
  sobre un diseño vacío se aplica directo.
- "Actualizar desde metadatos" — pide confirmación antes de sobrescribir texto manual.

## Fases completadas (A–H)

| Fase | Contenido | Commits |
|---|---|---|
| A | Modelo canónico, migración v1→v2, `getCoverDesign`/`getBackCoverDesign`, spike del renderer servidor | `04fdfd0` |
| B | `DesignSurfaceCanvas` (motor Fabric compartido: selección, mover, resize, rotar, undo/redo, zoom) | `d70a770` |
| C | Tipografía completa, controles de imagen, fondo, selector de color premium | `f8b4ce2` |
| D | Panel de capas, reglas, guías, snapping, safe-area/ISBN, grid | `a8999d9` |
| E | Rediseño de editor Básico y Avanzado sobre el mismo modelo | `07261e3` |
| F | Herencia de portada original PDF + acciones de confirmación | `83831c2` |
| G | Renderer servidor estructurado + integración en preview/export | `5bb521d` |
| H | i18n/accesibilidad de la barra de herramientas, grid responsive, E2E, este documento | `d2b8c8f`, este commit |

## Estado de los criterios PASS/FAIL de la misión (§83)

- ✅ Avanzado nunca ofrece menos que Básico (mismo modelo, `PropertiesPanel` expone control
  total; Básico es un subconjunto deliberado de campos por simplicidad, nunca al revés).
- ✅ Arrastre/resize persiste tras recargar (`readLayerPatchFromFabricObject` normaliza
  scale→width/height en el modelo persistido).
- ✅ Selección de fuente afecta la exportación (mismo `hydrateFabricLayerObject` en cliente
  y servidor).
- ✅ Las guías nunca aparecen en la exportación (estructural: viven en `surface.guides`,
  que ni `design-surface-render.ts` ni `DesignSurfaceRenderer.tsx` leen).
- ✅ Undo nunca pierde estado permanentemente (historial JSON-snapshot en
  `DesignSurfaceCanvas`).
- ✅ La portada original nunca se sobrescribe en silencio (el asset original nunca se
  toca; solo se genera una imagen derivada).
- ✅ Cambiar Básico↔Avanzado nunca pierde el diseño (mismo objeto controlado).
- ⚠️ Preview = exportación: verificado por construcción para PNG/PDF servidor
  (mismo motor Fabric); el preview DOM (`DesignSurfaceRenderer`) es una aproximación
  visual razonable (mismo estándar de fidelidad que el `CoverPreview` legacy que sustituye
  en su rama v2), no un renderer pixel-idéntico al servidor.
- ⚠️ Mobile: el modelo/componentes son responsive-aware (grid del editor Avanzado colapsa
  bajo 768px), pero la decisión de "mobile nunca debe intentar la UI Avanzada completa" es
  un enrutamiento a nivel de página que depende del punto siguiente (gaps).
- ❌ No verificable aún: el editor todavía no es alcanzable desde
  `/projects/[projectId]/cover` ni `/back-cover` en producción (ver Gaps).

## Gaps pendientes (no cerrados en esta sesión)

1. **Integración de página**: `CoverStudio.tsx` (legacy) sigue siendo el componente
   montado en `/projects/[projectId]/cover` y `/back-cover`. `BasicCoverEditor`/
   `AdvancedCoverEditor`/`CoverOriginPrompt` existen, están probados de forma aislada, pero
   nadie los monta en una ruta real todavía. Es el bloqueante para que la feature sea
   usable y para que los E2E de `e2e/cover-studio-v2.spec.ts` puedan ejecutarse.
2. **Enrutamiento mobile → Básico forzado**: sin la integración de página no hay un punto
   donde decidir "en mobile, nunca montar `AdvancedCoverEditor`" — el CSS ya degrada el
   grid, pero la misión pide explícitamente no intentar la UI Avanzada completa en mobile,
   que es una decisión de la página, no del componente.
3. **`next build` — advertencia de rastreo de archivos (NFT)**: al integrar
   `design-surface-render.ts` en `export-surface-image.ts`, `next build` (Turbopack) emite
   una advertencia no fatal ("Encountered unexpected file in NFT list") en la ruta
   `/api/projects/export/pdf`, causada por el `import('fabric/node')` dinámico. La
   mitigación ya existente desde la Fase A (`serverExternalPackages: ['canvas','fabric']` +
   `outputFileTracingIncludes` con `canvas/build/Release/**` para esa ruta exacta) debería
   cubrir el caso, pero **no se ha verificado en un Vercel Preview real** — es el primer
   punto a comprobar quirúrgicamente cuando se abra el PR.
4. **Fidelidad preview DOM vs. render servidor**: `DesignSurfaceRenderer.tsx` usa tamaños
   de fuente en píxeles absolutos del espacio de coordenadas nativo del `DesignSurface`
   (mismo enfoque que el `CoverPreview` legacy) — si el contenedor donde se monta no
   respeta el ancho nativo, el texto se ve desproporcionado. No es una regresión (mismo
   límite que el componente que sustituye), pero sigue abierto.
5. **Precios/costes de render servidor**: no se ha medido el tiempo de arranque en frío de
   `fabric/node` + `canvas` en una función Vercel real (Fluid Compute); solo se verificó
   correctitud, no rendimiento en producción.
6. **Sin panel de capas dedicado para formas (`shape`)**: `PropertiesPanel.tsx` muestra un
   mensaje de estado vacío para una capa de tipo `shape` seleccionada — no hay controles de
   relleno/borde todavía (gap documentado desde la Fase C).
7. **Plantillas de contraportada**: comparten solo 3 arquetipos de geometría (`default`,
   `body-heavy`, `minimal`) en vez de arquetipos bespoke por categoría como la portada —
   decisión de alcance documentada en `design-surface-templates.ts`.

## Tests

- `vitest run`: 220 archivos, 1401 tests, todos en verde (incluye specs reales contra
  `fabric/node` sin mockear en `design-surface-fabric.test.ts` y
  `design-surface-render.test.ts`, con `// @vitest-environment node`).
- `eslint .`: 0 errores (4 warnings preexistentes, ninguno en archivos de esta feature).
- `tsc --noEmit`: sin errores nuevos frente a la línea base preexistente del proyecto
  (~82-89 errores, documentada y no relacionada con esta feature).
- `next build`: compila correctamente: 1 advertencia no fatal de NFT (ver Gaps §3).
- Playwright: `e2e/cover-studio-v2.spec.ts` (7 escenarios) — sintaxis verificada
  (`playwright test --list`), **no ejecutados** contra infraestructura real porque el
  bloqueante del Gap §1 lo impide; listos para correr en cuanto la integración de página
  aterrice.

## Decisión de alcance de sesión

El usuario eligió explícitamente completar las Fases A–H en una sola sesión (frente a un
núcleo reducido A–E). Dado el tamaño del trabajo, la integración final de las páginas reales
(`/cover`, `/back-cover`) quedó fuera del límite de esta sesión — se prioritizó dejar cada
pieza (modelo, motor, controles, renderer, E2E) completa, probada y documentada de forma
aislada, en vez de una integración de página apresurada y sin cobertura.
