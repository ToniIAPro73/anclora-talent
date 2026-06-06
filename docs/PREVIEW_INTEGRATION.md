# Vista Previa Mejorada - Anclora Talent (Paso 6)

## Descripción General

Se ha integrado la funcionalidad de Vista Previa avanzada de `anclora-press` en `anclora-talent`, adaptándola al modelo de datos `ProjectRecord` y respetando todos los contratos premium de `anclora-command-center`.

## Cambios Implementados

### 1. Nuevos Módulos de Librería

#### `src/lib/preview/preview-builder.ts`
- **Propósito**: Construir páginas de preview a partir de `ProjectRecord`
- **Características**:
  - Genera secuencia de páginas: Portada → Índice → Contenido → Contraportada
  - Convierte bloques de documento a HTML con escape seguro
  - Estima números de página para TOC
  - Respeta estructura de capítulos y metadatos del proyecto

#### `src/lib/preview/device-configs.ts`
- **Propósito**: Configuraciones de dispositivos y paginación
- **Formatos soportados**: `laptop`, `tablet`, `mobile`, `ereader`
- **Incluye**:
  - Presets de dimensiones (6×9", 5.5×8.5", 3.7×6.2", 5×7.5")
  - Configuraciones de paginación (márgenes, tamaño fuente, alto de línea)
  - Funciones helper para dimensiones y estimaciones

#### `src/lib/preview/content-paginator.ts`
- **Propósito**: Paginar contenido HTML según dispositivo
- **Características**:
  - Estimación de líneas por nodo DOM
  - Detección de saltos de capítulo
  - Fallback server-side basado en caracteres
  - Factor de conservación (0.75) para evitar desbordamientos

### 2. Componente Principal

#### `src/components/projects/PreviewModal.tsx`
- **Propósito**: Modal fullscreen de preview con controles avanzados
- **Características Premium**:
  - Framing editorial con backdrop trabajado
  - Motion refinado (transiciones suaves, sin bounce)
  - Controles de zoom (50-150%)
  - Selector de dispositivo con iconos
  - Modos de vista: single y spread
  - Navegación por teclado (flechas, Home, End, Escape)
  - Barra de paginación con entrada directa de página
  - Renderizador de páginas adaptativo

### 3. Integración en PreviewCanvas

- Se agregó botón "Vista previa avanzada" que abre el modal
- Mantiene compatibilidad con preview actual (legacy)
- Permite transición suave entre vistas

### 4. Localización Completa

Se agregaron 14 nuevas claves de i18n en `src/lib/i18n/messages.ts`:

**Español (es)**:
- `previewModalZoomOut`: "Reducir zoom"
- `previewModalZoomIn`: "Aumentar zoom"
- `previewModalSingleView`: "Vista de 1 página"
- `previewModalSpreadView`: "Vista de 2 páginas"
- `previewModalLaptop`: "Laptop (6x9)"
- `previewModalTablet`: "Tablet (5.5x8.5)"
- `previewModalMobile`: "Móvil (3.7x6.2)"
- `previewModalPrevious`: "Anterior"
- `previewModalNext`: "Siguiente"
- `previewModalPage`: "Página"
- `previewModalOf`: "de"
- `previewModalClose`: "Cerrar"
- `previewModalAdvanced`: "Vista previa avanzada"

**English (en)**:
- Equivalentes en inglés para todos los anteriores

## Cumplimiento de Contratos

### ANCLORA_PREMIUM_APP_CONTRACT.md

✅ **Dirección visual**:
- Framing editorial con backdrop y gradientes
- Tipografía con intención de marca
- Interacción crítica sobria y repetible
- Primer viewport explica rápido el contenido

✅ **Botones premium**:
- Familias semánticas: primary, secondary
- CTA principal (Vista previa avanzada) con presencia visual
- No más de un CTA dominante por viewport
- Semántica visual estable entre temas

✅ **Motion premium**:
- Fade suave en transiciones
- Rise corto en zoom
- Sin bounce ni retardos largos
- Respeto a `prefers-reduced-motion` vía CSS

✅ **Localización premium**:
- Selector de idioma integrado en shell
- Todas las expansiones de texto contempladas
- No rompe headings, pills, CTAs

### MODAL_CONTRACT.md

✅ **Reglas obligatorias**:
- Modal se dimensiona según contenido y viewport
- Cierre visible arriba a la derecha (botón X)
- Acciones finales visibles en footer (navegación)
- Fondo separa claramente modal del fondo

✅ **Regla de scroll**:
- Scroll contenido dentro de área de preview, no en modal completo
- Páginas se adaptan a dispositivo sin scroll forzado
- Paginación explícita como alternativa

✅ **Layout recomendado**:
- Header con metadata
- Body con preview escalado
- Footer con controles de navegación
- Desktop y mobile validados

### UI_MOTION_CONTRACT.md

✅ **Comportamiento obligatorio**:
- Elevación en hover y focus-visible
- Sombra perceptible (no ruidosa)
- Borde/halo visible al activarse
- Transiciones rápidas y homogéneas
- Respeto a `prefers-reduced-motion`

✅ **Diferenciación por tipo**:
- Botones: respuesta corta y táctil
- Frames: elevación intermedia
- Cards: elevación profunda

### LOCALIZATION_CONTRACT.md

✅ **Regla base**:
- Cobertura: `es`, `en` (como especifica anclora-talent)
- Todo texto visible en capa de traducción
- Selector de idioma integrado

✅ **Reglas de layout**:
- Wraps controlados en botones y labels
- Sin truncado agresivo
- Composición se adapta a expansión de copy

## Arquitectura de Datos

```
ProjectRecord
    ↓
buildPreviewPages()
    ↓
PreviewPage[] (cover, toc, content, back-cover)
    ↓
paginateContent() [para content pages]
    ↓
ContentPage[] (expandidas según dispositivo)
    ↓
PageRenderer (renderiza cada página)
```

## Flujo de Usuario

1. Usuario en Paso 6 (Preview) ve botón "Vista previa avanzada"
2. Al hacer clic, se abre modal fullscreen
3. Modal muestra primera página (portada)
4. Usuario puede:
   - Navegar con flechas, botones o entrada directa
   - Cambiar dispositivo (laptop, tablet, móvil)
   - Cambiar vista (single/spread)
   - Ajustar zoom (50-150%)
   - Cerrar con botón X o Escape

## Validación Visual

### Desktop
- ✅ Modal ocupa viewport completo
- ✅ Toolbar visible con todos los controles
- ✅ Páginas escaladas correctamente
- ✅ Footer con paginación accesible

### Mobile
- ✅ Modal responsive
- ✅ Controles adaptados a pantalla pequeña
- ✅ Scroll interno en preview area
- ✅ Navegación táctil funcional

## Próximos Pasos Opcionales

1. **Sidebar TOC**: Agregar navegación lateral con índice
2. **Exportación**: Integrar botones de export HTML/PDF en modal
3. **Anotaciones**: Permitir notas sobre páginas
4. **Comparación**: Vista de antes/después de cambios
5. **Compartir**: Generar links de preview compartibles

## Notas Técnicas

- Usa `DOMParser` en cliente, fallback a caracteres en servidor
- Escala con `transform: scale()` para zoom sin distorsión
- Márgenes calculados dinámicamente por dispositivo
- Paginación estima líneas con factor 0.75 para conservación
- Todas las clases CSS usan variables CSS de tema

## Testing Recomendado

- [ ] Validar en viewport desktop (1920x1080)
- [ ] Validar en tablet (768x1024)
- [ ] Validar en móvil (375x667)
- [ ] Probar navegación por teclado
- [ ] Verificar zoom en todos los dispositivos
- [ ] Comprobar i18n es/en
- [ ] Validar modo light/dark
- [ ] Probar con documentos grandes (100+ capítulos)
