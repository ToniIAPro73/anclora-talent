# Checklist de validación — avisos de importación del editor de cubierta (2026-10-21)

> Este fichero se sobrescribe en cada entrega. El historial queda en Git.

**Repositorio:** anclora-talent
**Rama y commit de implementación:** development @ c39fd0b
**Entorno:** `npm run dev:docker` · localhost:3000
**Datos:** proyecto sintético de la cuenta QA dedicada `e2e.auth@anclora-talent.test`; no se usó una cuenta personal.

## 1. Qué cambia

- Al pasar el cursor o enfocar el control para importar/reemplazar una imagen de fondo, el aviso explica que solo cambia el fondo y que las demás capas se conservan.
- Al enfocar Importar portada o Importar contraportada, el aviso explica que sustituye el diseño activo, elimina sus capas y deja una imagen plana.
- Al enfocar Importar JSON, el aviso identifica la sección activa, explica que reemplaza ese diseño y sus capas, y aclara que la otra superficie permanece intacta.
- Los avisos aparecen al usar teclado, cuentan con descripción accesible en español e inglés y se posicionan dentro del viewport.

## 2. Verificaciones completadas

| Comprobación | Método | Resultado |
| --- | --- | --- |
| Pruebas focalizadas | `npx vitest run src/components/projects/design-surface/ContextualActionHint.test.tsx src/components/projects/design-surface/BackgroundEditor.test.tsx src/components/projects/design-surface/CoverStudioV2.test.tsx src/components/projects/design-surface/AdvancedCoverEditor.test.tsx` | PASS · 4 archivos, 46 pruebas |
| TypeScript | `npx tsc --noEmit` | PASS |
| ESLint de archivos afectados | `npx eslint` sobre componentes, pruebas y mensajes modificados | PASS |
| Gate de lint del repositorio | `npm run lint` | PASS |
| Build de producción | `npm run build` | PASS |
| Integridad del diff | `git diff --check` | PASS |
| Verificación visual del aviso JSON | `agent-browser` en portada, viewport 1280 × 577; se confirmó que el aviso queda visible dentro del viewport | PASS · `artifacts/qa/cover-import-action-hint.png` (ignorado por Git) |
| Verificación visual del aviso de fondo | `agent-browser`, fondo seleccionado; se confirmó el texto y su colocación sin recortar | PASS · `artifacts/qa/background-image-action-hint.png` (ignorado por Git) |
| Avisos de portada/contraportada plana | Pruebas de ambas variantes y traducciones | PASS |
| Traducciones y accesibilidad | Pruebas de español/inglés, `aria-describedby`, hover y foco de teclado | PASS |

## 3. Pruebas no ejecutadas

| Prueba | Motivo |
| --- | --- |
| Suite completa del repositorio | No era necesaria para este cambio localizado; pasaron 46 pruebas focalizadas y los gates del repositorio. |
| Captura visual en móvil y tablet | Se verificó escritorio. El tooltip limita su ancho al viewport y cambia de lado según el espacio vertical disponible. |

## 4. Validación manual sugerida

| # | Lugar | Acción | Resultado esperado |
| --- | --- | --- | --- |
| 1 | Portada y contraportada, propiedades del fondo | Seleccionar Imagen y pasar el cursor/enfocar “Imagen” o “Sustituir imagen” | Indica que solo cambia la capa de fondo y conserva las demás capas. |
| 2 | Portada | Pasar el cursor/enfocar “Importar portada” | Indica que reemplaza el diseño y elimina las capas para dejar una imagen plana. |
| 3 | Contraportada | Pasar el cursor/enfocar “Importar contraportada” | Indica el mismo efecto aplicado a la contraportada. |
| 4 | Portada y contraportada | Pasar el cursor/enfocar Importar JSON | Indica qué sección activa importa, qué diseño/capas reemplaza y que el otro lado no cambia. |

## 5. Decisión de promoción

- No se promociona este cambio. La promoción completa previa se ejecutó para los commits `6cf97ae` y `0c5a71e`; esta entrega nueva se publica solo en `development`.
