# Skill: Anclorabot Multiagente System for Synergi

Esta habilidad adapta la metodología multiagente del ecosistema Anclora al proyecto `anclora-synergi`.

## Objetivo

Orquestar el desarrollo end-to-end de `Synergi` siguiendo SDD, con descomposición por features, coordinación entre especialistas y una hoja de ruta única basada en el roadmap vigente.

## Infraestructura de coordinación

- `.agent/team/tasks.json` -> tablero maestro de tareas, estados y dependencias.
- `.agent/team/mailbox/` -> mensajes entre especialistas.
- `.agent/team/broadcast.msg` -> directrices globales del director.
- `.agent/team/locks/` -> semáforos para evitar colisiones.
- `.agent/team/approvals/` -> aprobaciones humanas cuando aplique.

## Roles adaptados a Synergi

1. `Director (Anclorabot)`  
   Descompone roadmap, define fases y valida dependencias.

2. `Agent A (Product & UX)`  
   Responsable de flujos públicos, login partner, workspace UX y consistencia premium.

3. `Agent B (Backend & Auth)`  
   Responsable de API routes, sesiones admin, auth partner y políticas de acceso.

4. `Agent C (Data & Neon)`  
   Responsable de schema, consultas, migraciones y consistencia del modelo partner.

5. `Agent D (QA & Hardening)`  
   Responsable de test plans, regresiones, seguridad, riesgos y validación final.

## Protocolo

### 1. Plan primero

Antes de tocar una feature, el agente debe explicitar:
- archivos a crear o modificar
- dependencias
- riesgos
- criterio de salida

### 2. Dependencias

Una tarea no se toma si sus dependencias no están cerradas en `tasks.json`.

### 3. Regla SDD

Toda feature vive en:
- `sdd/features/<feature>/...`

Y debe enlazar con:
- `sdd/core/product-spec-v0.md`
- `sdd/core/spec-core-v1.md`
- `public/docs/anclora-synergi-roadmap-v1.md`

### 4. Objetivo de cierre

Completar `Synergi` end-to-end:
- admisión pública
- backoffice interno de revisión
- login partner
- workspace partner
- seguridad y operación
