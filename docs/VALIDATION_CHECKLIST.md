# Checklist de validación — espacio de portada y contraportada (2026-10-21)

> Este fichero se sobrescribe en cada entrega. El historial queda en Git.

**Repositorio:** anclora-talent
**Rama y revisión validada:** `development` @ `512dc60` + cambios locales de esta entrega
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
| Inspección visual de las rutas | NO EJECUTADA — `npm run dev` no arranca: Node 24 no resuelve el import nombrado `loadEnvConfig` de `@next/env` en `scripts/dev-runtime.mjs` |
| Build de producción | NOT RUN — no requerido para este cambio localizado |
| Validación de deployment | NOT RUN — contrato incompleto; faltan `HOSTING_PROVIDER` y `PRODUCTION_DEPLOY_BRANCH` |

## Pendiente de revisión de Toni

| # | Área | Comprobación |
| --- | --- | --- |
| 1 | Portada | Confirmar que el lienzo queda despejado, el zoom está en la barra superior y las acciones de historial están junto a JSON/PNG. |
| 2 | Contraportada | Confirmar la misma distribución y que el lienzo mantiene sus dimensiones reales sin mostrar el rótulo fijo. |
| 3 | Espacio inferior | Confirmar que ya no aparecen «Revisión orientativa» ni «Sistema de colección» bajo los editores. |

## Limitaciones conocidas

La verificación visual automatizada quedó impedida por el fallo de arranque documentado arriba. El runtime visual sí está instalado y operativo. No se usó una cuenta personal ni se hicieron escrituras en la base de datos.
