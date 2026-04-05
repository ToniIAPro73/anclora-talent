# PRD — Mejora premium del proceso de importación editorial

## Problema original
El usuario necesita mejorar una aplicación que crea proyectos editoriales desde cero o desde documentos previos (`doc`, `docx`, `markdown`, `pdf`, `txt`).
La importación actual degrada la estructura del documento original y obliga al usuario a rectificar demasiado. El objetivo es que la importación sea lo más fiel posible, con comportamiento premium.

## Preferencias explícitas del usuario
- Prioridad principal: jerarquía editorial, comprobando también la maquetación visual.
- Alcance: importación + vista previa + exportaciones.
- Comportamiento premium: autocorregir lo seguro y avisar lo dudoso.
- Debe mejorar el caso real proporcionado sin perder generalidad.

## Decisiones de arquitectura
- Mantener el modelo editorial existente (`chapters` + `blocks`) y enriquecer el parser, en vez de rehacer el dominio.
- Para `docx`, priorizar extracción rica con Mammoth en HTML y usar heurísticas adicionales para:
  - detectar portada,
  - detectar autor,
  - separar prólogo,
  - consolidar subtítulo,
  - preservar listas/encabezados.
- Permitir bloques HTML en capítulos importados para que preview y editor conserven listas y jerarquías.
- Añadir un puente FastAPI ligero en `/app/backend/server.py` para que supervisor funcione en este repo single-app Next.js.
- Añadir un wrapper de frontend en `/app/frontend/package.json` para que supervisor levante la app desde la estructura esperada por la plataforma.

## Implementado
- Parser de importación reescrito para preservar mejor jerarquía y estructura editorial.
- Extracción DOCX basada en HTML rico con Mammoth, con fallback seguro.
- Detección mejorada de:
  - título,
  - autor,
  - subtítulo consolidado,
  - prólogo,
  - índice,
  - capítulos/partes principales.
- Soporte mejorado de listas, headings y bloques HTML dentro del modelo editorial.
- API `/api/projects/import` enriquecida para devolver:
  - título,
  - subtítulo,
  - autor,
  - capítulos detectados,
  - warnings,
  - vista previa de estructura.
- UI de importación premium en `DocumentImporter` con panel de análisis previo.
- Compatibilidad reforzada en preview/editor para renderizar encabezados, listas y HTML importado.
- Segmentación refinada para respetar mejor la estructura real del manuscrito: los `h1` estructurales del cuerpo ahora generan capítulos independientes (incluidos los días del programa).
- Preview ajustado para insertar una página de portada/título separada antes del primer capítulo importado, evitando mezclar portada y prólogo en la misma hoja.
- Paginación del preview rehecha para estimar altura editorial por bloques, encabezados, listas y fragmentos HTML, evitando meter demasiado contenido en una sola página.
- `data-testid` añadidos a más controles clave del flujo editorial.
- Supervisor desbloqueado para este repo:
  - `frontend` ya levanta en `/app/frontend` mediante wrapper.
  - `backend` ya levanta en `/app/backend` mediante puente hacia Next.

## Validación realizada
- Tests verdes:
  - `src/lib/projects/import.test.ts`
  - `src/components/projects/PreviewCanvas.test.tsx`
  - `src/components/projects/DocumentImporter.test.tsx`
  - `src/lib/projects/actions.test.ts`
  - `src/components/projects/CreateProjectForm.test.tsx`
  - `src/components/projects/ProjectWorkspace.test.tsx`
- Resultado real del DOCX aportado:
  - título: `NUNCA MÁS EN LA SOMBRA`
  - autor: `Antonio Ballesteros Alonso`
  - 38 capítulos detectados tras respetar mejor la jerarquía real del contenido
- Servicios verificados:
  - `frontend` RUNNING
  - `backend` RUNNING
  - `GET http://127.0.0.1:8001/health` OK
  - `GET http://127.0.0.1:3000/` OK

## Backlog priorizado

### P0
- Probar end-to-end el flujo autenticado real de importación con credenciales Clerk válidas.
- Añadir fixture DOCX estable en el repo para pruebas automáticas del caso real.

### P1
- Mejorar aún más la condensación de subtítulos largos de portada.
- Añadir tests de preview visual con listas y contenido HTML real importado.
- Completar `data-testid` en el resto de controles interactivos del workspace.

### P2
- Añadir score/confianza por campo detectado (título, autor, capítulos).
- Añadir reglas editoriales específicas por tipo de manuscrito (ensayo, guía, novela, no ficción).
- Añadir diff visual entre estructura original detectada y estructura final importada.

## Próximos pasos sugeridos
1. Validar el flujo autenticado real con una cuenta de prueba.
2. Revisar cómo quieres resumir subtítulos largos en portada vs documento.
3. Extender el mismo estándar premium a exportación HTML/PDF con pruebas visuales dedicadas.