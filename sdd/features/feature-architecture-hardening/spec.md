# Feature: Architecture Hardening

## Objetivo

Convertir la revision de arquitectura, deuda y testing en una base operativa: scripts sanos,
infraestructura de test y documentacion accionable.

## Archivos previstos

- Crear `sdd/features/feature-architecture-hardening/review.md`
- Crear `vitest.config.ts`
- Crear `src/test/setup.ts`
- Modificar `package.json`
- Modificar `README.md`

## Dependencias

- `feature-canonical-document`

## Riesgos

- Introducir demasiada infraestructura antes de validar el flujo editorial.
- Mezclar findings estrategicos con correcciones tacticas sin separacion documental.

## Criterio de salida

- El repo puede ejecutar tests de UI y dominio.
- Los scripts son portables en Windows.
- Existe un documento de deuda y huecos de testing con prioridades claras.
