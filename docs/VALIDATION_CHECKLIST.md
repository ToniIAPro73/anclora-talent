# Checklist de validación — editor de portada y cabecera

**Repositorio:** `anclora-talent`

**Rama:** `development`

**Commits:** `e7e355a` (editor/cabecera) y `e6ad13d` (proporciones responsive)
**Alcance:** cabecera global simplificada; flujo de ocho pasos conservado; controles de cabecera redundantes retirados; herramientas y paneles del editor de portada/contraportada compactados para dar más área al lienzo. En escritorio las herramientas usan iconos con nombre accesible; en móvil y tablet vertical se mantienen en una fila compacta.

## Corrección del gate de GitHub

El gate de `testid-coverage-contract` detectó 16 controles nativos sin `data-testid` en `CoverEditorialSystemPanel.tsx`. Se añadieron identificadores estables a los botones, selectores e inputs del panel.

| Comprobación | Comando | Resultado |
| --- | --- | --- |
| Contrato de cobertura de controles | `npm run test:run -- src/components/projects/testid-coverage-contract.test.ts` | PASS — 3 tests |
| TypeScript | `npx tsc --noEmit` | PASS |
| Integridad del diff | `git diff --check` | PASS |

## Comprobaciones

| Comprobación | Resultado |
| --- | --- |
| Tests de cabecera y workspace | PASS — 2 archivos, 32 tests |
| Tests del editor y utilidades de portada | PASS — 7 archivos, 56 tests |
| TypeScript (`npx tsc --noEmit`) | PASS |
| ESLint dirigido a los archivos modificados | PASS |
| Integridad (`git diff --check`) | PASS |

## Verificación visual

Usé `agent-browser` en el runtime local con la identidad QA dedicada existente. No se alteró ni eliminó esa cuenta.

| Viewport | Resultado observado |
| --- | --- |
| Móvil 390 × 844 | Cabecera en una fila; categorías en iconos de 40 × 36 px; lienzo a ancho completo |
| Tablet vertical 768 × 1024 | Categorías compactas; lienzo a ancho completo |
| Escritorio 1440 × 1000 | Herramientas 44 px, capas 200 px, lienzo 918 px, propiedades 248 px |

Capturas: `/tmp/talent-refined-mobile.png` y `/tmp/talent-proportions-desktop.png`.

## Límites conocidos

- La reimportación de un JSON local no pudo verificarse desde el selector de archivos del navegador.
- Permanecen diferencias de paridad registradas en `sdd/features/cover-editor-modernization/parity-matrix-v1.md`.

## Git y promoción

El hook local pidió sobrescribir este checklist antes del push; por eso se incluye una actualización documental para esta entrega. El push autorizado es únicamente a `origin/development`. No se solicitó promoción.
