# Anclora Talent

Plataforma editorial construida sobre `Next.js App Router`, `Clerk`, `Neon` y `Vercel Blob`, y clonada de Anclora Press y mejorada.

## Branding canónico

- Familia visual: `Premium`
- Accent objetivo: `#4A9FD8` azul cielo
- Secondary: `#A0D0F0` azul pálido
- Tipografía objetivo: `DM Sans` + `JetBrains Mono`
- Borde de icono: cobre `#C07860`
- Interior de icono: navy `#141E28`
- Assets finales: pendientes de sustitución cuando el usuario los entregue
- Contrato de referencia: `ANCLORA_PREMIUM_APP_CONTRACT`
- Alcance de esta fase: dejar la app preparada estructuralmente para recibir esos activos sin rehacer el wiring

## Estado actual

El repo ya no usa Vite. La nueva base incluye:

- landing pública
- autenticación con Clerk
- dashboard protegido
- creación de proyecto
- editor de documento canónico
- preview del mismo contenido
- estudio de portada
- capa de persistencia preparada para Neon
- subida de assets preparada para Blob

Cuando `DATABASE_URL` no está configurada, el repositorio cae a una store en memoria para no
bloquear el desarrollo local. En producción, el destino es Neon.

## Scripts

- `npm run dev`: arranca Next.js en local
- `npm run build`: compila la app
- `npm run start`: sirve la build
- `npm run lint`: ejecuta ESLint
- `npm run test`: arranca Vitest
- `npm run test:run`: ejecuta la suite una vez
- `npm run clean`: limpia `.next` y `coverage`
- `npm run db:generate`: genera artefactos Drizzle
- `npm run db:push`: aplica schema a la base definida en `.env.local`
- `npm run db:studio`: abre Drizzle Studio

## Variables de entorno

Ver [.env.example](c:/Users/antonio.ballesterosa/Desktop/Proyectos/anclora-talent/.env.example).

Claves mínimas:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`
- `DATABASE_URL`
- `BLOB_READ_WRITE_TOKEN`

## Arquitectura

- `src/app`: rutas App Router, layouts, auth y área protegida
- `src/components`: UI de producto
- `src/lib/auth`: guards y helpers de auth
- `src/lib/db`: schema Drizzle, Neon lazy y repositorios
- `src/lib/projects`: tipos, factories y server actions
- `src/lib/blob`: utilidades de Blob
- `sdd/`: especificación del producto y roadmap

## Flujo MVP implementado

`login -> dashboard -> crear proyecto -> editor -> preview -> cover`

## Próximo paso lógico

Conectar importación real `txt/docx` y exportación PDF sobre este mismo modelo.
