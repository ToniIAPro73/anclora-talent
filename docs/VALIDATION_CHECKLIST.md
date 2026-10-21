# Checklist de validación — botones de opciones de fondo de portada (2026-10-21)

> Este fichero se sobrescribe en cada entrega. El historial queda en Git.

**Repositorio:** anclora-talent
**Rama:** development

## 1. Qué cambia

- Las opciones de tipo de fondo y de encuadre de imagen son botones separados.
- El botón seleccionado reutiliza el fondo azul y la marca lateral de la barra de herramientas.
- Rellenar, Ajustar y Original usan iconos distintos y mantienen sus etiquetas accesibles.

## 2. Verificaciones completadas

| Comprobación | Método | Resultado |
| --- | --- | --- |
| Regresión focalizada | `npx vitest run src/components/projects/design-surface/BackgroundEditor.test.tsx` | PASS · 1 archivo, 10 pruebas |
| ESLint focalizado | `npx eslint src/components/projects/design-surface/BackgroundEditor.tsx src/components/projects/design-surface/BackgroundEditor.test.tsx` | PASS |
| TypeScript | `npx tsc --noEmit` | PASS |
| QA visual compartido | `agent-browser` en localhost con cuenta dedicada `e2e.auth@anclora-talent.test`, temas claro y oscuro | PASS · grupos separados y selección visible |
| Integridad del diff | `git diff --check` | PASS |

## 3. Alcance

- La QA visual se realizó en un proyecto de la cuenta dedicada de QA sobre Docker local. No se usó una cuenta personal ni se borró la identidad de QA.
- No se ejecutó la suite completa; el cambio afecta los controles del editor de fondo y se validó con el test focalizado.

## 4. Promoción

- Esta entrega se limita a `development`; no se ha iniciado una promoción.
