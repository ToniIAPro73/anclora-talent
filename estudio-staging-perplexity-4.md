
Ahora mismo ya has hecho el 90 % del trabajo duro: en `staging` el preview está usando el **mismo motor de columnas** que el editor (`MultipageFlow`) y la misma cadena `normalize → reconcileOverflowBreaks → columnas CSS`.[^1]
Lo que queda son un par de *desajustes finos* de CSS y layout que hacen que, en páginas largas como el índice que muestras, el corte por página no sea idéntico.

Voy a ir a cosas muy concretas que puedes tocar.

***

## 1. Dónde estamos ahora (staging)

### Editor de capítulos

- Layout multipágina en `AdvancedRichTextEditor.tsx`:
    - Contenedor: `.multipage-editor-flow` con `column-width`, `column-gap`, `column-fill: auto`.[^1]
    - Frames de página: `.multipage-page-frame` + `.multipage-page-inner`, altura `pageHeight`, relleno con `margins`.[^1]
    - Reglas clave para saltos:

```css
.ProseMirror hr[data-page-break="manual"],
.preview-page hr[data-page-break="manual"],
.ProseMirror hr[data-page-break="true"],
.preview-page hr[data-page-break="true"] {
  border: 0;
  border-top: 2px dashed rgba(196, 154, 36, 0.45);
  margin: 1.75rem 0;
  break-after: column;
  page-break-after: always;
  -webkit-column-break-after: always;
}

.ProseMirror hr[data-page-break="auto"],
.preview-page hr[data-page-break="auto"] {
  border: 0;
  height: 0;
  margin: 0;
  opacity: 0;
  pointer-events: none;
  break-after: column;
  page-break-after: always;
  -webkit-column-break-after: always;
}
```

Es decir:
        - Manual / true → visible, con margen vertical.
        - Auto → invisible, sin margen extra.[^1]
- El número de páginas del editor (`totalRenderablePages`) se calcula por `paginateContent` + `reconcileOverflowBreaks`, y el layout visual de columnas usa **las mismas dimensiones** (`contentWidth`, `contentHeight`, `columnGap`).[^1]


### Preview

- `MultipageFlow.tsx` usa también columnas CSS y mide las páginas a partir del `scrollWidth` del contenedor `.flow-content-root.ProseMirror`, dividiendo por `(contentWidth + columnGap)`.[^1]
- `PreviewModal.tsx`:
    - Construye `contentHtml` así:

```ts
const html = chapterBlocksToHtml(chapter.blocks);
const normalized = normalizeDocumentHtml(html);
return reconcileOverflowBreaks(normalized, paginationConfig);
```

y luego concatena capítulos con `<hr data-page-break="manual">`.[^1]
    - Renderiza:
        - Página 0: portada (`PageRenderer`).
        - Páginas 1…N: `MultipageFlow` con `html={contentHtml}` y `onPageCountChange={setTotalContentPages}`.
        - Última página: contraportada, si existe.[^1]

Esto está muy bien alineado con el editor; las capturas que envías ya lo reflejan (la estructura de las columnas es casi 1:1). El problema está en los detalles siguientes.

***

## 2. Primer punto a corregir: estilos de `<hr data-page-break>` en `MultipageFlow`

En el editor, como hemos visto, **manual y auto no se comportan igual** (margen vs sin margen).
En `MultipageFlow.tsx` ahora tienes un único bloque:[^1]

```css
.flow-content-root.ProseMirror hr[data-page-break] { 
  display: block !important;
  border: 0 !important;
  border-top: 2px dashed transparent !important;
  height: 0 !important;
  margin: 1.75rem 0 !important;
  padding: 0 !important;
  break-after: column !important; 
  -webkit-column-break-after: always !important; 
  page-break-after: always !important;
  visibility: visible !important;
}
```

Consecuencias:

- Todos los `<hr data-page-break="auto">` están aportando **1.75 rem de margen vertical** en el preview, cuando en el editor tienen `margin: 0`.[^1]
- Cada salto automático te roba “altura útil” respecto al editor → el preview tiene menos texto por columna que el editor, o corta el párrafo en otro sitio.

Esto cuadra con tu sensación de “ha mejorado pero aún no coincide”: aunque el número de columnas se parece, el punto exacto de corte cambia cuando hay muchos autos.

### Qué haría

En `MultipageFlow.tsx`, cambia ese bloque por una copia exacta de las reglas del editor, adaptadas a `.flow-content-root`:

```ts
<style>{`
  .flow-content-root.ProseMirror hr[data-page-break="manual"],
  .flow-content-root.ProseMirror hr[data-page-break="true"] {
    border: 0;
    border-top: 2px dashed rgba(196, 154, 36, 0.45);
    margin: 1.75rem 0;
    break-after: column;
    page-break-after: always;
    -webkit-column-break-after: always;
  }

  .flow-content-root.ProseMirror hr[data-page-break="auto"] {
    border: 0;
    height: 0;
    margin: 0;
    opacity: 0;
    pointer-events: none;
    break-after: column;
    page-break-after: always;
    -webkit-column-break-after: always;
  }
`}</style>
```

Y elimina el bloque genérico `hr[data-page-break]`. Con eso:

- Un manual entre capítulos seguirá metiendo espacio visible.
- Los autos no alterarán la altura útil de la columna, igual que en el editor.

Para un índice como el de tus capturas, donde hay bastantes autos, esto sueles ver un cambio claro en el punto de corte.

***

## 3. Segundo punto: CSS de texto 1:1 con el editor

En `AdvancedRichTextEditor.tsx` tienes un bloque global de estilos que aplica **a la vez** a `.ProseMirror` y `.preview-page` (p, h1–h6, listas, estilos de bullets avanzados, etc.).[^1]

En `MultipageFlow.tsx` solo estás replicando una parte (p, h1–h4, algunos detalles de color).[^1]

Aunque visualmente parezca lo mismo, pequeñas diferencias aquí (por ejemplo:

- si h2/h3 tienen la misma `margin-bottom`,
- si `ul/ol` tienen la misma `margin-bottom` y `padding-left`,
- si los bullets especiales (diamond/arrow/check) tienen el mismo `padding-left`)

pueden cambiar el número de líneas que cabe en una columna y, por tanto, el corte exacto. En un índice tan denso como el de la captura, esto se nota.[^1]

### Qué haría

En vez de intentar “imitar” el CSS, yo **copiaría literalmente** el bloque del editor y lo adaptaría a `.flow-content-root.ProseMirror`:

1. Copia de `AdvancedRichTextEditor.tsx` todo el bloque que empieza en:

```css
.ProseMirror {
  font-size: ${previewConfig.fontSize}px;
  line-height: ${previewConfig.lineHeight};
  ...
}
...
.ProseMirror hr:not([data-page-break]),
.preview-page hr:not([data-page-break]) { ... }
```

2. En `MultipageFlow.tsx`, mete ese bloque dentro del `<style>` y cambia cada selector `.ProseMirror` → `.flow-content-root.ProseMirror` (puedes mantener los que mencionan `.preview-page` si los sigues usando en otras rutas).
3. Elimina cualquier regla de texto duplicada que ya no haga falta en `MultipageFlow`.

Así te aseguras de que:

- El motor de layout (columnas + alturas) es el mismo.
- **Y** el micro‑layout de texto (márgenes de headings, listas, bullets, etc.) también es exactamente el mismo.

***

## 4. Tercer punto: medición de páginas en el preview

En el editor, el número de páginas que muestra la barra inferior (`totalRenderablePages`) viene de `countRenderablePages(paginateContent(reconciledHtml, previewConfig))`, y el layout de columnas se adapta a eso.[^1]

En el preview, `MultipageFlow` mide así:[^1]

```ts
const contentArea = multipageFlowRef.current.querySelector('.flow-content-root') as HTMLElement | null;
const measuredWidth = contentArea.scrollWidth;
const pages = Math.max(
  1,
  Math.ceil((measuredWidth + 1) / (contentWidth + columnGap)),
);
setMeasuredTotalPages(pages);
onPageCountChange(pages);
```

Esto es razonable, pero hay dos detalles a vigilar:

1. **Desfase inicial**: usas `setTimeout(measureRenderablePages, 50)` en el `useEffect`. Si el HTML tarda un poco más en pintar (p.ej. fonts cargando), la primera medición puede salir “corta” y luego corregirse, lo que provoca saltos de numeración.[^1]
    - Suele ser un tema cosmético, pero puede afectar a capítulos muy cortos (1–2 páginas).
2. **Coherencia con el editor**: si quieres máxima paridad, puedes usar **el mismo número de páginas que calcula el editor** como límite superior. Tienes varias opciones:
    - Pasar desde `useChapterEditor` al preview, junto al `project`, el `totalPages` real del capítulo actual (ya lo calculas) y, si `measuredTotalPages` en el preview difiere en ±1, forzar el mismo valor.[^1]
    - O limitar `pages` con un “snap”:

```ts
const snappedPages = Math.max(1, Math.round(measuredWidth / (contentWidth + columnGap)));
```

para reducir off‑by‑one por temas de sub‑píxeles.

Para tu caso concreto (mismo dispositivo, mismo zoom al 100 %), el mayor impacto viene de los puntos 2.1 y 2.2 (CSS de hr y micro‑layout), pero este tercer ajuste te da un plus de robustez.

***

## 5. Resumen de retoques que te aconsejo hacer ahora

En orden de impacto:

1. **MultipageFlow – reglas de `hr[data-page-break]`**
    - Separar `manual/true` de `auto` igual que en el editor.
    - Los autos sin margen → nada de altura fantasma entre columnas.
2. **MultipageFlow – copiar el CSS de texto del editor**
    - Copiar literalmente el bloque `.ProseMirror` → `.flow-content-root.ProseMirror`.
    - Asegurarte de que h1–h6, `p`, `ul/ol`, bullets especiales, etc. tienen los mismos márgenes y padding.
3. **Opcional ahora / recomendable después**
    - Afinar `measureRenderablePages` para que “snapée” mejor y, si quieres, cruzarlo con el `totalPages` del editor para evitar off‑by‑one raros.

Con estos ajustes, para un índice como el de tus pantallazos, lo esperable es que:

- **La página 1 del preview y la página 1 del editor contengan exactamente las mismas líneas, en el mismo punto de corte**, siempre que uses el mismo dispositivo / tamaño de fuente / márgenes y el contenido esté guardado.[^1]

Si quieres, cuando hayas aplicado el cambio de CSS en `MultipageFlow` y copiado el bloque del editor, podemos revisar juntos un diff sintético para comprobar que no se ha quedado ninguna regla importante fuera.
<span style="display:none">[^2]</span>

<div align="center">⁂</div>

[^1]: Captura_2.jpg

[^2]: Captura_1.jpg

