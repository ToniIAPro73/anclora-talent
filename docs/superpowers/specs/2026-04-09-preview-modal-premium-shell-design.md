# Preview Modal Premium Shell Design

## Context

`PreviewModal` ya utiliza `buildPreviewPages()` como fuente de verdad para el contenido del libro, pero su framing visual y su composición general no cumplen todavía el estándar de modal premium definido en:

- `../Boveda-Anclora/docs/standards/MODAL_CONTRACT.md`
- `../Boveda-Anclora/docs/standards/ANCLORA_PREMIUM_APP_CONTRACT.md`

El modal actual funciona como visor, pero se percibe demasiado plano y utilitario para un momento clave del producto: mostrar el resultado final del trabajo editorial. La referencia estructural válida dentro del propio producto es `ChapterEditorFullscreen`, que sí mantiene jerarquía modal clara, framing sobrio y controles estables.

## Goal

Rediseñar `PreviewModal` para que se sienta como un modal premium elegante y editorial, manteniendo al libro como protagonista y sin perder claridad operativa, navegación visible ni control del scroll.

## Non-Goals

- No cambiar `buildPreviewPages()` como fuente de verdad.
- No convertir el preview en una página separada.
- No introducir una interfaz ceremonial que compita visualmente con el libro.
- No degradar la funcionalidad actual de zoom, navegación, índice y cambio de dispositivo.

## Chosen Direction

Se adopta una dirección de **editorial shell sobrio**:

- la estructura base toma como referencia el modal del editor de capítulos
- el framing exterior del modal gana intención premium
- el protagonismo visual sigue estando en las páginas del libro
- los controles se reorganizan para acompañar, no para invadir

## UX Structure

### 1. Modal shell

El preview debe vivir dentro de una carcasa modal casi fullscreen claramente separada del fondo:

- backdrop premium más trabajado que el actual
- superficie modal con borde, profundidad y contraste claros
- composición centrada y estable
- nada de “pantalla completa plana” sin framing

### 2. Header

El header debe parecer un header de modal premium, no una toolbar genérica:

- eyebrow editorial
- título del proyecto con truncado correcto
- metadato breve del modo actual si aporta valor
- botón de cierre visible arriba a la derecha
- densidad sobria y compacta, similar al editor de capítulos

### 3. Body

El body debe pasar a una composición explícita por zonas:

- rail izquierdo para índice y navegación editorial
- escenario central para el libro
- banda de controles de vista colocada como bloque secundario claro, sin competir con las páginas

En desktop el layout será de tres zonas visuales, aunque técnicamente puedan resolverse como dos columnas más una banda superior de controles. El libro debe seguir ocupando la máxima superficie útil.

En mobile:

- el índice deja de ocupar columna fija
- pasa a panel colapsable o bloque desplegable
- el escenario del libro ocupa casi todo el ancho útil

### 4. Footer

El footer debe recuperar la lógica contractual del modal:

- acciones persistentes y visibles
- navegación anterior/siguiente
- control de página actual
- jerarquía clara entre acciones neutrales y primarias

No debe desaparecer al crecer el contenido del preview.

## Visual Language

### Premium framing

El tratamiento premium admitido debe concentrarse en:

- backdrop
- shell del modal
- headline area
- paneles auxiliares

No debe trasladarse al contenido del libro, que ya tiene su propio lenguaje editorial.

### Book-first principle

La zona del libro debe ser el foco:

- más aire alrededor del spread
- separación clara entre shell y páginas
- los paneles no deben robar atención por contraste o peso excesivo

### Motion

La motion debe ser contenida:

- fade/rise corto al abrir
- transiciones suaves en paneles y controles
- sin bounce
- sin delays largos

## Scroll Strategy

Se aplica estrictamente `MODAL_CONTRACT.md`:

- no habrá scroll global del modal salvo último recurso
- el escenario central puede tener scroll propio para acomodar zoom y spread
- si el índice crece demasiado, el scroll vive en el rail del índice
- header y footer permanecen visibles

## Functional Behavior

Se mantiene:

- `buildPreviewPages(project, config)` como fuente única del contenido
- modo single/spread
- cambio de dispositivo
- autofit zoom inicial
- zoom manual
- navegación por teclado
- índice derivado de las páginas renderizadas

Se ajusta:

- la presentación y agrupación de controles
- la composición del índice
- la jerarquía visual del footer

## Implementation Notes

`PreviewModal.tsx` debe reestructurarse en bloques más claros:

- `PreviewModalShell`
- `PreviewModalHeader`
- `PreviewModalControls`
- `PreviewModalSidebar`
- `PreviewModalStage`
- `PreviewModalFooter`

No es obligatorio extraer todos esos componentes en esta iteración si hacerlo añade fricción, pero la organización interna del archivo debe reflejar esas responsabilidades.

## Testing

Se debe ampliar `PreviewModal.test.tsx` para cubrir:

- shell premium con header, body y footer visibles
- cierre visible en header
- footer persistente
- índice presente en desktop y colapsable en mobile si esa variante se implementa
- persistencia de la fuente de verdad basada en `buildPreviewPages()`

Además, antes de darlo por cerrado, hay que hacer validación visual real en:

- desktop
- mobile

Confirmando:

- ausencia de scroll evitable de modal completo
- cierre visible
- footer visible
- libro como foco principal
- degradación correcta del layout entre viewports

## Acceptance Criteria

La feature estará lista cuando:

- el preview se perciba como modal premium y no como pantalla utilitaria
- cumpla la estructura operativa del contrato modal
- conserve el libro como protagonista
- siga reflejando fielmente el estado guardado de capítulos, portada y contraportada
- quede validado visualmente en desktop y mobile
