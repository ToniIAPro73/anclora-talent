<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" style="height:64px;margin-right:32px"/>

# en todos los casos

Entonces tiene sentido que los veas desincronizados *en todos los casos*: en `staging` el **editor y el preview siguen usando motores de layout distintos**, aunque compartan el motor de paginación lógico.

## Qué pasa exactamente en `staging`

### Editor de capítulos

El editor avanzado:

- Renderiza el contenido en **una sola superficie con columnas CSS** (`column-width`, `column-gap`), dentro de `.multipage-editor-flow`.
- Aplica `break-after: column` sobre los `<hr data-page-break="...">` para forzar saltos de columna.
- Usa `reconcileOverflowBreaks` + `paginateContent` solo para insertar `<hr data-page-break="auto">`, pero el layout real lo decide **el navegador** con CSS multi‑columna.

Es decir, lo que tú ves como “página 1, página 2…” en el editor viene del flujo de columnas, no de `paginateContent`.

### Preview

El preview en `staging` hace otra cosa:

- Construye páginas con `buildPreviewPages(project, config)`, que para cada capítulo hace:

```ts
const reconciledChapterHtml = reconcileOverflowBreaks(chapter.html, config);
const chapterPageHtmls = paginateContent(reconciledChapterHtml, config)
  .filter(hasRenderablePageContent)
  .map(page => page.html);
```

- Cada página se renderiza como un `div` independiente con clase `preview-page`, sin columnas:

```tsx
<div style={pageStyle} className="preview-page ...">
  <style>{`
    .preview-page { font-size: ${config.fontSize}px; line-height: ${config.lineHeight}; }
    .preview-page p + p { margin-top: 0.8rem; }
    ...
  `}</style>
  <div dangerouslySetInnerHTML={{ __html: page.content || '' }} />
</div>
```


Aquí el layout lo decide **el motor heurístico** de `paginateContent` (estimación por líneas), no el sistema de columnas del editor.

Resultado: aunque hayas afinado `estimateNodeLines` y los factores 0.98 / 0.45, nunca será 1:1 con el layout real de columnas, por eso ves diferencias sistemáticas en todas las obras.

## Conclusión directa

- Con la arquitectura actual de `staging`, **no puedes conseguir coincidencia perfecta de páginas editor ↔ preview**.
- Has acercado mucho la lógica (mismo `reconcileOverflowBreaks`, mismo `paginateContent`, misma `PaginationConfig`), pero mientras el editor use columnas CSS y el preview use páginas “cortadas” por heurística, siempre habrá desplazamientos.


## Qué habría que cambiar para que coincidan de verdad

Tienes dos caminos realistas:

1. **Que el preview use el mismo layout de columnas que el editor (sin `paginateContent`):**
    - Para el contenido de capítulos, en vez de construir `page.content` con `paginateContent`, renderiza un único HTML reconciliado (`reconcileOverflowBreaks`) en un contenedor con:
        - `column-width`, `column-gap`
        - `hr[data-page-break]` con `break-after: column`
    - Y usa frames vacíos (igual que el editor) para “ventanear” las columnas que corresponden a la página N.
    - Ventaja: es literalmente el mismo motor visual → páginas idénticas.
2. **O que tanto editor como preview usen un único motor de layout basado en medición DOM (sin columnas):**
    - Reescribir `paginateContent` para que, en cliente, haga layout real: montar el HTML en un contenedor oculto, medir altura de nodos, ir rellenando la página hasta `availableHeight`, etc.
    - El editor dejaría de usar columnas CSS y pasaría a mostrar páginas en stack usando ese mismo motor.
    - Ventaja: una sola implementación de layout; backend puede seguir usando el fallback por caracteres.

Con lo que hay en `staging` ahora mismo, estás en un híbrido: el editor usa el motor “real” (CSS columns) y el preview un motor aproximado (`paginateContent`). Mientras eso no cambie, el comportamiento que describes (“en todos los casos”) es exactamente lo esperable.

Si quieres, en el próximo mensaje te propongo un diseño concreto para opción 1 (reutilizar el flujo de columnas en el preview) con pasos/diffs muy concretos.

