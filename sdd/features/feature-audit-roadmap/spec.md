# Feature: Audit Roadmap

## Objetivo

Auditar el estado real del repo, adaptar la skill `anclorabot-multiagente-system` al proyecto
actual y fijar el siguiente plan tecnico con dependencias y criterio de salida.

## Archivos

- Crear `.agent/team/tasks.json`
- Crear `.agent/team/broadcast.msg`
- Crear `sdd/features/feature-audit-roadmap/spec.md`
- Crear `sdd/features/feature-canonical-document/spec.md`
- Crear `sdd/features/feature-architecture-hardening/spec.md`
- Crear `sdd/features/feature-runtime-validation/spec.md`

## Dependencias

- Ninguna

## Hallazgos de auditoria

- El repo ya tiene shell modular en `src/app`, `src/features` y `src/shared/ui`.
- La prioridad declarada en `sdd/architecture.md` y `sdd/roadmap.md` es un documento canonico
  compartido entre importacion, editor, preview y export.
- No existe infraestructura de test automatizado.
- El README sigue siendo heredado de AI Studio y no describe el producto actual.
- `package.json` usa `clean: rm -rf dist`, poco portable en PowerShell.
- Hay dependencias de backend (`express`, `dotenv`, `tsx`, `@google/genai`) sin integracion
  visible en la app actual.

## Siguiente plan tecnico

1. Crear el documento canonico y un repositorio local tipado para convertir la demo en flujo real.
2. Conectar editor y preview al mismo source of truth con una muestra editorial estable.
3. Introducir tests base con Vitest para proteger el modelo, el store y el flujo editor-preview.
4. Corregir scripts y documentacion operativa para que el repo pueda verificarse end-to-end.
5. Levantar la app, comprobar rendering real y registrar roturas pendientes fuera de alcance.

## Riesgos

- Si se implementa estado local por pantalla, se rompe la regla de fuente de verdad unica.
- Si se añaden tests sin jsdom ni setup comun, la base de testing naceria fragil.
- Si el documento canonico es demasiado complejo, se frena el avance del MVP.

## Criterio de salida

- Existen cuatro features SDD declaradas.
- La prioridad tecnica queda fijada en el documento canonico compartido.
- El repo tiene tablero de tareas minimo y dependencias explicitadas.
