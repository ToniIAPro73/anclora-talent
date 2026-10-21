# Checklist de validación — editores de portada y contraportada (2026-10-21)

**Repositorio:** anclora-talent  
**Rama y revisión validada:** `development` @ `53adbd1`  
**Entorno:** local con `npm run dev:docker`; sin despliegue ni promoción.

## Cambios incluidos

- Importación contextual: «Importar portada» y «Importar contraportada» según el editor.
- Inspector compacto con nombre de capa en la fila de Propiedades, tipografía y posición/tamaño abiertas por defecto, y espaciado/aspecto cerrados.
- Selector de tipografía compacto: búsqueda y categorías visibles, lista de fuentes con scroll propio y posición automática dentro del viewport.
- Reposicionamiento del selector al cambiar el tamaño de ventana o desplazarse; ancho adaptado a móvil, tablet y escritorio.

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| Pruebas focalizadas de `FontSelector`, `AdvancedCoverEditor` y `TextLayerProperties` | PASS — 36 pruebas |
| TypeScript (`npx tsc --noEmit`) | PASS |
| ESLint focalizado en selector y pruebas | PASS |
| Build (`npm run build`) | PASS |
| `git diff --check` | PASS |
| QA visual compartido con `agent-browser` y cuenta dedicada | PASS — escritorio 1440×900, tablet 768×1024 y móvil 390×844; apertura hacia arriba/abajo y límites del viewport confirmados. Capturas en `artifacts/qa/font-picker-*.png` |

## Limitaciones

La QA visual se realizó en el runtime local con la identidad dedicada `e2e.auth@anclora-talent.test`. No se seleccionaron fuentes ni se editaron diseños durante esta comprobación. No se realizó promoción.
