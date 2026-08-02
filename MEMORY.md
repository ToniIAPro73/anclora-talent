<!-- ANCLORA-ECOSYSTEM-CONTEXT-START -->
### Memoria de ecosistema Anclora

El ecosistema Anclora tiene arquitecturas distintas por producto. Antes de actuar sobre despliegues, bases de datos, auth o variables, todo agente debe consultar `.anclora/global/ANCLORA_ECOSYSTEM_CONTEXT.md` y el contrato canónico `ANCLORA_ECOSYSTEM_ARCHITECTURE_CONTRACT.md` en Boveda-Anclora.

Caso crítico conocido: Anclora Nexus usa frontend en Vercel (`/frontend`), backend en Render (`/backend`) y Supabase para Auth/DB. No usar Neon como sustituto directo de Supabase en Nexus sin rediseñar auth/datos. No hay Supabase Pro/Branching ni segundo proyecto Supabase si exige upgrade; staging requiere flags/guards si comparte Supabase.
<!-- ANCLORA-ECOSYSTEM-CONTEXT-END -->

## 2026-08-02 — Auth propia (Fase A), Clerk retirado

- Se eliminó `@clerk/nextjs` por completo. La autenticación ahora es propia, dentro del propio Next.js, sin servicios externos.
- Modelo de datos: tablas `users` (email único lowercase, `password_hash` bcrypt) y `sessions` (id = SHA-256 del token opaco, FK cascade a `users`, `expires_at` 30 días con renovación deslizante). Migración: `src/db/migrations/0002_cultured_scorpion.sql` + pasos idempotentes en `scripts/ensure-migrations.js`.
- Sesión: token opaco de 32 bytes (`crypto.randomBytes`) en cookie `anclora_session` (`httpOnly; Secure; SameSite=Lax; Path=/`); en DB solo se persiste el hash. Nombre de cookie y opciones en `src/lib/auth/constants.ts`.
- Route handlers: `POST /api/auth/register` (409 email duplicado), `POST /api/auth/login` (401 genérico, rate-limit en memoria por IP+email: 5 intentos/10 min, comparación constante con hash dummy), `POST /api/auth/logout`, `GET /api/auth/me`.
- Guards: `src/lib/auth/guards.ts` expone `getCurrentUser()`, `requireUser()` y `requireUserId()` (misma firma que con Clerk: devuelve `userId` string o redirige a `/sign-in` con `buildAbsoluteAppUrl`).
- Protección de rutas: `src/proxy.ts` delega en `src/lib/auth/middleware.ts` (`protectRequest`): gate por presencia de cookie en `/dashboard`, `/projects`, `/api/blob`; la validación fuerte sigue en `requireUserId`.
- Pantallas `/sign-in` y `/sign-up` propias (`LoginPageContent`/`RegisterPageContent`) siguiendo ANCLORA_AUTH_LOGIN_SCREEN_CONTRACT v1.3.0; clases `.talent-auth-*` en `globals.css` consumen solo tokens del design system (sin hex) para heredar el cambio de acento de la Fase B.
- `AppShell` sustituye `<UserButton>` por `UserMenu` propio con nombre/email y "Cerrar sesión". `LegalFooter` se excluye de rutas de auth.
- Los `userId` almacenados en `projects`/`activity_log`/`user_preferences` ahora son UUID de `users.id` (caben en `varchar(191)`); la tabla legacy `app_users` (con `clerk_user_id`) se conserva sin uso activo.
- Credenciales de prueba E2E documentadas en `memory/test_credentials.md`.
