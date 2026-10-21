# Checklist de validación — recuperación del selector de portada (2026-10-21)

> Este fichero se sobrescribe en cada entrega. El historial queda en Git.

**Repositorio:** anclora-talent

**Rama:** development

## 1. Qué cambia

- El estado inicial permite volver al editor sin seleccionar una opción de origen.
- Las opciones de portada original, edición sobre la página original, plantilla y lienzo en blanco explican su efecto.
- Los errores de lectura/rasterización del PDF se muestran como aviso recuperable, sin error de runtime ni cierre del selector.
- Se añadieron copias en español e inglés.

## 2. Verificaciones completadas

| Comprobación | Método | Resultado |
| --- | --- | --- |
| Regresión focalizada | `npx vitest run src/components/projects/design-surface/CoverOriginPrompt.test.tsx src/components/projects/design-surface/CoverStudioV2.test.tsx src/lib/projects/pdf-page-rasterizer.test.ts` | PASS · 3 archivos, 26 pruebas |
| TypeScript | `npx tsc --noEmit` | PASS |
| ESLint focalizado | `npx eslint` sobre componentes, pruebas y mensajes afectados | PASS |
| QA visual compartido | `anclora-visual-qa` + `agent-browser` en localhost con cuenta dedicada `e2e.auth@anclora-talent.test`; estado vacío en modo claro y oscuro, sin overlay de error | PASS |
| Salida sin selección | `agent-browser`, botón “Volver al editor sin elegir” | PASS · se abrió el editor vacío |
| Error PDF recuperable | Prueba de componente con rechazo `Invalid PDF structure` | PASS · alerta visible, opciones conservadas y sin rechazo sin capturar |
| Integridad del diff | `git diff --check` | PASS |

## 3. Límites de la comprobación

- Se verificó la recuperación de interfaz simulando el rechazo de PDF.js. No se inspeccionó el PDF del proyecto mostrado en la captura, por lo que no se determinó por qué esos bytes concretos no son una estructura PDF válida.
- La QA visual usó un proyecto dedicado en la base Docker local; no se usó una cuenta personal ni se borró la identidad QA.

## 4. Decisión de promoción

- No se solicita promoción en esta tarea. El cambio se publicará únicamente en `development`.
