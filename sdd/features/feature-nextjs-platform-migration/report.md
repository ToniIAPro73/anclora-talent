# Next.js Platform Migration Report

## Resultado

La aplicación ha sido migrada de Vite a `Next.js App Router` con una nueva base preparada para:

- `Clerk free`
- `Neon Postgres`
- `Vercel Blob`
- `Drizzle ORM`

## Vertical entregada

- landing pública
- rutas de sign-in y sign-up
- dashboard autenticado
- creación de proyecto
- editor del documento canónico
- preview
- cover studio

## Verificación

- `npm run lint` OK
- `npm run test:run` OK
- `npm run build` OK
- `npm run dev` arranca correctamente
- `GET /` devuelve `200`
- `GET /sign-in` devuelve `200`

## Notas operativas

- Si `DATABASE_URL` no existe, el repositorio usa una store en memoria para desarrollo local.
- La persistencia de producción requiere configurar Neon.
- La subida real de imágenes de portada requiere `BLOB_READ_WRITE_TOKEN`.
- La autenticación real requiere claves de Clerk válidas.
