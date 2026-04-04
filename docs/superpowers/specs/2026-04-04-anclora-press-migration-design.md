# Migracion De Anclora Press A Anclora Talent - Design

**Fecha:** 2026-04-04

## Objetivo

Convertir `anclora-talent` en el producto editorial principal, absorbiendo la experiencia funcional completa de `anclora-press` sin perder:

- branding, logo y lenguaje visual de Talent
- contratos universales y premium ya definidos en `docs/standards/`
- arquitectura basada en `Clerk + Neon + Vercel Blob`

La fuente de verdad del sistema debe permanecer en servidor. La persistencia `local-first/offline` de `anclora-press` no forma parte de la primera ola.

## Estado De Partida

### Anclora Talent

`anclora-talent` ya tiene una base de producto más adecuada para producción:

- App Router
- autenticacion con Clerk
- persistencia preparada para Neon
- almacenamiento pesado en Vercel Blob
- server actions
- contratos de calidad visual y de producto en `docs/standards/`

Pero su experiencia editorial es un MVP:

- importacion muy superficial de documentos
- editor basado en `textarea`
- un modelo de documento demasiado estrecho
- portada simple
- sin borrado de proyectos
- sin organizacion editorial real

### Anclora Press

`anclora-press` aporta experiencia funcional madura:

- importacion avanzada multi-formato
- segmentacion en capitulos
- editor enriquecido con Tiptap
- workspace con sidebar y preview
- gestion de libros/capitulos
- borrado
- portada avanzada y contraportada
- preview paginada

Su debilidad para este objetivo es arquitectonica:

- fuerte acoplamiento a `local-first`
- IndexedDB como base de persistencia
- componentes pensados para su propio dominio interno
- contratos visuales distintos a Talent

## Decision Arquitectonica

Se adopta una **migracion adaptativa**.

Eso significa:

- `anclora-talent` se mantiene como base
- se portan capacidades de `anclora-press`, no su arquitectura completa
- toda capacidad portada debe adaptarse al dominio, persistencia y branding de Talent

No se hara una fusion de aplicaciones ni un copiado masivo de UI sin reencapsular.

## Principios De Migracion

1. **Server-first**
   Todo cambio relevante debe persistirse en Neon o Blob. El navegador no sera la fuente de verdad.

2. **Capability porting**
   Se migran flujos, comportamiento y logica reutilizable desde Press. Si una pieza depende de IndexedDB o de estructuras incompatibles, se reescribe sobre el dominio de Talent.

3. **Contracts first**
   Ninguna pantalla migrada puede saltarse:
   - `ANCLORA_PREMIUM_APP_CONTRACT.md`
   - contratos universales del ecosistema
   - contratos de color, modales, motion y localizacion

4. **Domain expansion before UI**
   Antes de portar el workspace, Talent debe disponer de un modelo editorial suficiente para soportarlo.

5. **Blob for heavy assets**
   Archivos fuente, derivados de importacion, portadas rasterizadas y assets pesados deben ir a Blob, no embebidos en registros ligeros.

## Modelo Objetivo

`project` pasa de ser un contenedor lineal a un contenedor editorial completo.

Entidades objetivo:

- `project`
  - identidad, estado, owner, metadata de producto
- `project_document`
  - titulo, subtitulo, idioma, resumen, source metadata
- `project_chapter`
  - orden, titulo, slug editorial, estado
- `project_block`
  - contenido estructurado por capitulo
- `project_asset`
  - originales importados, portadas, fondos, thumbnails, derivados
- `project_cover`
  - configuracion de portada y salida final
- `project_back_cover`
  - configuracion de contraportada y salida final
- `project_export`
  - snapshots y artefactos de exportacion

El objetivo de la primera ola no es modelar colaboracion en tiempo real ni versionado completo, sino habilitar experiencia editorial completa sobre persistencia de servidor.

## Mapa De Capacidades A Migrar

### Desde Press Hacia Talent

- importacion avanzada y validaciones de archivo
- pipeline DOCX/PDF/TXT/MD con estructura semantica
- chapter organizer
- editor rico con toolbar
- workspace editorial completo
- preview paginada
- gestor de proyectos con seleccion y borrado
- portada avanzada
- contraportada
- exportacion y previsualizacion mas ricas

### Mantener En Talent

- branding y logo
- tokens y superficies premium
- contratos visuales y de UX
- autenticacion Clerk
- Neon y Blob
- convenciones actuales de routing y server actions

## Estrategia Por Fases

### Fase 1: Dominio Y Persistencia

Expandir schema, repositorios, tipos y acciones para soportar capitulos, bloques, assets y borrado. Sin esta fase, la UI avanzada queda forzada a simular estado que el backend aun no soporta.

### Fase 2: Importacion Editorial

Portar la logica de importacion semantica de Press y adaptarla a server actions/API de Talent. El resultado debe crear proyectos completos y no solo un puñado de bloques.

### Fase 3: Workspace Editorial

Introducir un workspace parecido al de Press, pero conectado al dominio de Talent. El editor deja de ser formulario lineal y pasa a ser experiencia editorial real.

### Fase 4: Portadas Y Assets

Portar portada avanzada y contraportada, respaldando assets en Blob y manteniendo la visual premium de Talent.

### Fase 5: Preview, Export Y Hardening

Cerrar el ciclo completo del producto: preview, exportacion, borrado, validaciones, observabilidad y contratos.

## Riesgos Principales

### Riesgo 1: Mezcla De Dos Dominios

Si se intenta montar la UI de Press sobre el modelo actual de Talent, apareceran adaptadores temporales que luego se quedan permanentes. Eso eleva deuda y rompe trazabilidad.

Mitigacion:

- ampliar primero el dominio
- prohibir accesos directos de componentes migrados a estructuras de Press

### Riesgo 2: Reuso AcrItico De Componentes

Copiar componentes de Press tal cual importaria estilos, supuestos de estado local y decisiones de UX que chocan con Talent.

Mitigacion:

- reenvolver o rehacer la capa de presentacion
- reutilizar logica y comportamiento antes que markup final

### Riesgo 3: Assets Pesados Mal Modelados

Si documentos originales, previews o portadas se guardan como campos ligeros o blobs improvisados en base de datos, el sistema se degradara rapido.

Mitigacion:

- todos los binarios van a Blob
- Neon guarda referencias, metadata y estados de procesamiento

### Riesgo 4: Romper Contratos Premium

La UI de Press puede introducir densidad, modales, superficies, color o motion fuera de contrato.

Mitigacion:

- validar cada pantalla portada contra `docs/standards`
- incorporar tests de contrato donde haga falta

## Criterios De Exito

La migracion se considerara exitosa cuando `anclora-talent` permita:

- crear, listar, abrir y borrar proyectos
- importar documentos complejos preservando estructura util
- editar varios capitulos con editor rico
- reorganizar el contenido editorial
- diseñar portada y contraportada con experiencia avanzada
- previsualizar y exportar desde el modelo completo
- almacenar archivos pesados en Blob
- mantener branding y contratos de Talent sin regresiones visibles

## Lo Que Queda Fuera De La Primera Ola

- modo offline completo
- IndexedDB como fuente de verdad
- sincronizacion bidireccional compleja cliente-servidor
- colaboracion en tiempo real
- versionado editorial profundo

Esas capacidades podran evaluarse despues, sobre la nueva base server-first.
