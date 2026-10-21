# Checklist de validación — espacio de portada y contraportada (2026-10-21)

> Este fichero se sobrescribe en cada entrega. El historial queda en Git.

**Repositorio:** anclora-talent
**Rama y revisión validada:** `development` @ `7a35c49`
**Entorno:** validación local focalizada. No se ha publicado ni desplegado. El contrato no declara `HOSTING_PROVIDER` ni `PRODUCTION_DEPLOY_BRANCH`.

## Cambios incluidos

- Se quitaron la barra flotante de zoom y el rótulo fijo con dimensiones del lienzo; el zoom sigue disponible en la barra superior.
- Se trasladaron Deshacer/Rehacer a la fila de acciones junto a importar/exportar JSON y exportar PNG.
- Se retiraron de las rutas de edición los paneles inferiores «Revisión orientativa» y «Sistema de colección».
- Se añadieron las especificaciones, planes y tareas SDD para ambos ajustes.

## Comprobado por el agente

| Comprobación | Resultado |
| --- | --- |
| Pruebas focalizadas `AdvancedCoverEditor`, `CoverWorkspace08A` y `CoverStudioV2` | PASS — 40 pruebas |
| TypeScript (`npx tsc --noEmit`) | PASS |
| ESLint focalizado en componentes y pruebas modificadas | PASS |
| `git diff --check` | PASS |
| Doctor del runtime visual compartido | PASS — navegador y motor disponibles |
| Inspección visual de portada y contraportada | PASS — `agent-browser` con `npm run dev:docker`, 1440×1000, cuenta QA dedicada; ambas rutas tienen contenido, sin overlay de error, zoom flotante ni paneles inferiores. Capturas: `artifacts/qa/cover-workspace-docker-final.png` y `artifacts/qa/back-cover-workspace-docker-final.png` |
| Build de producción (`npm run build`) | PASS — compilación y generación de rutas completadas |
| Validación de deployment | NOT RUN — contrato incompleto; faltan `HOSTING_PROVIDER` y `PRODUCTION_DEPLOY_BRANCH` |

## Pendiente de revisión de Toni

| # | Área | Comprobación |
| --- | --- | --- |
| 1 | Portada | Confirmar que el lienzo queda despejado, el zoom está en la barra superior y las acciones de historial están junto a JSON/PNG. |
| 2 | Contraportada | Confirmar la misma distribución y que el lienzo mantiene sus dimensiones reales sin mostrar el rótulo fijo. |
| 3 | Espacio inferior | Confirmar que ya no aparecen «Revisión orientativa» ni «Sistema de colección» bajo los editores. |

## Limitaciones conocidas

La inspección visual se hizo con el runtime local Docker (`npm run dev:docker`) y la cuenta QA dedicada `e2e.auth@anclora-talent.test`; no se usó una cuenta personal ni se modificaron datos del proyecto.
