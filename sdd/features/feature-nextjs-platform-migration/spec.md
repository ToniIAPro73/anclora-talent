# Feature: Next.js Platform Migration

## Objetivo

Sustituir la base Vite actual por una plataforma `Next.js App Router` con `Clerk free`,
`Neon Postgres` y `Vercel Blob`, dejando una vertical completa:

- login y registro
- dashboard autenticado
- creación de proyecto
- editor del documento
- preview
- estudio de portada
- persistencia preparada para Neon
- almacenamiento de assets preparado para Blob

## Decisiones cerradas

- Corte limpio, no convivencia prolongada con Vite.
- Cuentas individuales primero.
- Diseño preparado para workspaces futuros sin modelarlos aún como flujo activo.
- `Clerk` como auth gestionada.
- `Neon` como base de datos principal.
- `Blob` para binarios y archivos pesados.
- `Drizzle ORM` para schema y acceso a datos.

## Arquitectura objetivo

- `src/app`: App Router, layouts, auth pages, dashboard y rutas de proyecto.
- `src/components`: componentes de interfaz de producto.
- `src/features`: UI por dominio funcional reutilizable.
- `src/lib/auth`: helpers de Clerk y guards.
- `src/lib/db`: schema Drizzle, acceso lazy a Neon y repositorios.
- `src/lib/blob`: token route y utilidades de assets.
- `src/lib/projects`: actions y contratos de proyecto, documento, preview y portada.

## Modelo de datos inicial

- `app_users`
- `projects`
- `project_documents`
- `document_chapters`
- `document_blocks`
- `project_assets`
- `cover_designs`
- `cover_layers`
- `design_templates`
- `export_jobs`
- `activity_log`

Preparación futura:

- `workspace_id` nullable en entidades clave
- `project_members` para futura colaboración

## Vertical mínima exigida

1. Usuario entra con Clerk.
2. Crea un proyecto.
3. Se genera un documento base.
4. Edita bloques del documento.
5. Ve preview del mismo contenido.
6. Ajusta portada y la guarda.

## Archivos a crear o modificar

- Sustituir `package.json`, `package-lock.json`, `tsconfig.json`, `.gitignore`
- Eliminar infraestructura Vite (`vite.config.ts`, `index.html`, `dist/`)
- Crear `next.config.ts`, `middleware.ts`, `next-env.d.ts`
- Crear `drizzle.config.ts`
- Crear `src/app/**`
- Crear `src/lib/**`
- Crear `src/components/**`
- Crear `src/features/**`
- Crear `src/db/migrations/**`
- Actualizar `README.md`, `.env.example`, `sdd/architecture.md`, `sdd/data-model.md`, `sdd/roadmap.md`

## Riesgos

- Intentar integrar Neon/Blob con inicialización en module scope y romper `next build`.
- Dejar auth validada solo en middleware.
- Modelar desde ya workspaces completos y sobrecargar el MVP.
- Migrar UI sin una frontera clara entre server y client components.

## Criterio de salida

- El repo compila como Next.js App Router.
- Existen rutas de auth y área autenticada.
- La vertical `login -> proyecto -> editor -> preview -> portada` está implementada.
- El acceso a Neon y Blob está preparado con utilidades lazy y contratos claros.
- El repo pasa verificación local (`lint`, `test`, `build`).
