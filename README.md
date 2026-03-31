# Anclora Talent

Aplicación editorial construida con React + Vite para evolucionar un manuscrito desde una fuente
cruda hasta un producto digital listo para revisión, preview y exportación.

## Estado actual

El repo ya dispone de:

- shell modular por features en `src/app`, `src/features` y `src/shared/ui`
- documento canónico local en `src/domain/document`
- editor y preview conectados al mismo source of truth
- base de testing con Vitest + Testing Library
- documentación SDD en `sdd/` y `sdd/features/`

## Scripts

- `npm run dev`: levanta la app en `http://localhost:3000`
- `npm run lint`: ejecuta `tsc --noEmit`
- `npm run test`: inicia Vitest en watch
- `npm run test:run`: ejecuta la suite una vez
- `npm run build`: genera `dist/`
- `npm run preview`: sirve la build local
- `npm run clean`: elimina `dist/` de forma portable

## Arranque local

1. Instala dependencias con `npm install`
2. Ejecuta `npm run dev`
3. Abre `http://localhost:3000`

## Arquitectura

- `src/domain/document`: contratos del documento editorial y repositorio local
- `src/app`: shell, navegación y layout global
- `src/features/upload`: ingestión y estrategia de importación
- `src/features/editor`: edición semántica sobre el documento canónico
- `src/features/cover`: estudio de portada
- `src/features/preview`: render del mismo contenido que edita el usuario
- `src/features/strategy`: roadmap y criterios de entrega
- `src/shared/ui`: primitivas visuales reutilizables

## SDD

- `sdd/product.md`: alcance del producto
- `sdd/architecture.md`: reglas de arquitectura
- `sdd/data-model.md`: entidades del dominio editorial
- `sdd/roadmap.md`: orden recomendado de implementación
- `sdd/features/`: features activas con objetivo, riesgos, dependencias y criterio de salida

## Próximo paso recomendado

Cerrar la siguiente historia vertical del MVP:

`txt/docx -> normalización -> edición -> preview -> export inicial`
