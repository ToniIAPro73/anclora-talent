# Feature: Premium Dark Theme And Localization Contract

## Objetivo

Elevar `Anclora Talent` al grupo `Premium` del ecosistema Anclora, fijando `dark mode` como modo
por defecto en toda la experiencia, incorporando toggles visibles de `tema` e `idioma` en el shell
autenticado, y alineando la app y la bóveda con los contratos generales y premium vigentes.

## Contexto

La app ya tiene una base funcional real con `Clerk`, `Neon` y `Vercel Blob`, pero su contrato UX/UI
todavía está incompleto:

- mezcla superficies claras y oscuras entre landing, auth y workspace
- `Clerk` mantiene una apariencia clara aunque el workspace ya empuja hacia oscuro
- no existen toggles visibles de `theme` ni `locale`
- el idioma no está gobernado desde una capa de interfaz compartida
- `anclora-talent` aún no figura como aplicación `Premium` en la bóveda ni en la matriz de
  cumplimiento contractual

El usuario ha fijado explícitamente:

- familia contractual: `Premium`
- idiomas objetivo: `es`, `en`
- idioma por defecto: `es`
- tema por defecto: `dark`

## Resultado esperado

- Toda la app se siente diseñada primero para `dark`, no derivada desde claro.
- `light` existe como modo alternativo completo y coherente.
- El shell autenticado muestra controles visibles de `tema` e `idioma` integrados en la identidad
  premium.
- El idioma y el tema persisten entre pantallas y sesiones razonablemente.
- Landing, `sign-in`, `sign-up`, dashboard, editor, preview y cover comparten un mismo sistema
  visual premium.
- La bóveda clasifica `anclora-talent` como aplicación `Premium` y registra su estado de
  cumplimiento.

## Contratos aplicables

En la bóveda:

- `docs/standards/ANCLORA_ECOSYSTEM_CONTRACT_GROUPS.md`
- `docs/standards/ANCLORA_PREMIUM_APP_CONTRACT.md`
- `docs/standards/UI_MOTION_CONTRACT.md`
- `docs/standards/MODAL_CONTRACT.md`
- `docs/standards/LOCALIZATION_CONTRACT.md`
- `docs/governance/CONTRACT_CONDITION_CATALOG.md`
- `docs/governance/CONTRACT_COMPLIANCE_MATRIX.md`

Condiciones mínimas a cubrir:

- `M1-M6`
- `L1-L5`
- `P1-P5`

## Alcance funcional

### 1. Tema

- `dark` será el modo inicial del documento y del shell.
- `light` seguirá disponible mediante toggle visible en el área autenticada.
- El tema debe afectar a:
  - landing pública
  - auth shell
  - componentes Clerk
  - shell autenticado
  - dashboard
  - create project
  - editor
  - preview
  - cover

### 2. Idioma

- Se soportarán `es` y `en`.
- El idioma por defecto será `es`.
- El selector de idioma será visible en la topbar del shell autenticado.
- La primera fase debe cubrir como mínimo:
  - shell
  - navegación principal
  - auth shell
  - landing CTA y bloques críticos
  - dashboard y formularios principales

### 3. Persistencia de preferencias

- `theme` y `locale` deben persistir entre pantallas.
- La solución puede apoyarse en `cookies` para lectura server-side y en sincronización client-side
  ligera para cambios interactivos.
- No se introducirá una dependencia pesada de i18n si una capa local simple cubre bien `es/en`.

### 4. Bóveda y contratos

- `anclora-talent` debe añadirse a la familia `Premium` en la bóveda.
- Debe reflejarse su objetivo contractual:
  - idiomas `es/en`
  - tema `dark/light`
  - contratos mínimos `Base + premium`
- Debe registrarse una auditoría inicial con estado probablemente `PARTIAL` si aún no existe
  verificación visual exhaustiva de todas las pantallas.
- El repo `anclora-talent` debe incluir en `docs/standards/` las copias de los contratos que le
  aplican.

## Arquitectura propuesta

### 1. UI preferences layer

Crear una capa ligera de preferencias de interfaz para resolver:

- lectura inicial de `theme`
- lectura inicial de `locale`
- persistencia del cambio desde el cliente
- exposición simple al shell y a las pantallas

La capa debe separar:

- utilidades server-side para leer preferencias desde cookie
- provider client-side para mutar preferencias y reflejarlas en el DOM
- componentes presentacionales de toggle

### 2. Tokens visuales globales

`src/app/globals.css` dejará de estar gobernado por una raíz clara. Debe convertirse en un sistema
de tokens por `theme`, con:

- variables base para `dark`
- variables equivalentes para `light`
- bindings comunes para fondos, texto, superficies, bordes y selección

Los componentes no deben depender de fondos hardcodeados incompatibles con el tema activo salvo
casos premium deliberados y controlados.

### 3. Capa de localización mínima

Se introducirá un diccionario `es/en` propio para la interfaz, orientado a:

- labels del shell
- toggles
- auth shell
- dashboard
- CTAs y copy principal

No se pretende internacionalizar todavía todo el contenido editable del usuario.

### 4. Shell premium

`AppShell` pasará a ser la pieza contractual central:

- branding premium
- navegación principal
- `theme toggle`
- `locale toggle`
- `UserButton`
- framing consistente con el resto del grupo premium

Los toggles deben parecer parte del producto, no controles utilitarios añadidos al final.

## Archivos previstos

### En `anclora-talent`

- Modificar `src/app/layout.tsx`
- Modificar `src/app/globals.css`
- Modificar `src/app/page.tsx`
- Modificar `src/app/sign-in/[[...sign-in]]/page.tsx`
- Modificar `src/app/sign-up/[[...sign-up]]/page.tsx`
- Modificar `src/app/(app)/layout.tsx`
- Modificar `src/app/(app)/dashboard/page.tsx`
- Modificar `src/app/(app)/projects/new/page.tsx`
- Modificar `src/app/(app)/projects/[projectId]/editor/page.tsx`
- Modificar `src/app/(app)/projects/[projectId]/preview/page.tsx`
- Modificar `src/app/(app)/projects/[projectId]/cover/page.tsx`
- Modificar `src/components/layout/AppShell.tsx`
- Modificar `src/components/auth/AuthShell.tsx`
- Modificar `src/components/auth/clerkAppearance.ts`
- Modificar `src/components/projects/CreateProjectForm.tsx`
- Modificar `src/components/projects/ProjectCard.tsx`
- Modificar `src/components/projects/EditorForm.tsx`
- Modificar `src/components/projects/CoverForm.tsx`
- Crear `src/components/layout/ThemeToggle.tsx`
- Crear `src/components/layout/LocaleToggle.tsx`
- Crear `src/components/providers/UiPreferencesProvider.tsx`
- Crear `src/lib/ui-preferences/preferences.ts`
- Crear `src/lib/ui-preferences/preferences.client.ts`
- Crear `src/lib/i18n/messages.ts`
- Crear tests asociados a preferencias, toggles y textos críticos
- Crear `docs/standards/ANCLORA_ECOSYSTEM_CONTRACT_GROUPS.md`
- Crear `docs/standards/ANCLORA_PREMIUM_APP_CONTRACT.md`
- Crear `docs/standards/UI_MOTION_CONTRACT.md`
- Crear `docs/standards/MODAL_CONTRACT.md`
- Crear `docs/standards/LOCALIZATION_CONTRACT.md`

### En `Boveda-Anclora`

- Modificar `docs/standards/ANCLORA_ECOSYSTEM_CONTRACT_GROUPS.md`
- Modificar `docs/governance/CONTRACT_COMPLIANCE_MATRIX.md`
- Modificar la documentación canónica de `Anclora Talent` en la bóveda para reflejar familia
  premium y el nuevo estado contractual

## Riesgos

- Añadir toggles sin una capa real de preferencias y terminar con UI cosmética.
- Traducir solo piezas parciales y violar `L1-L5`.
- Resolver `light` como inversión superficial del `dark` y violar `P3`.
- Mantener `Clerk` en claro y romper el contrato en `sign-in/sign-up`.
- Tocar demasiados componentes sin un sistema de tokens común y generar más divergencia.

## Testing y validación

- Tests unitarios de preferencias:
  - `theme` por defecto = `dark`
  - `locale` por defecto = `es`
  - persistencia de cambios
- Tests de helpers de mensajes `es/en`
- Tests del shell para asegurar presencia visible de toggles
- Tests de páginas críticas con textos localizados
- `npm run test:run`
- `npm run lint`
- `npm run build`
- Validación visual en navegador de:
  - landing
  - `sign-in`
  - `sign-up`
  - dashboard
  - editor
  - preview
  - cover
  - desktop y móvil
  - `dark` y `light`
  - `es` y `en`

## Criterio de salida

- La app puede arrancar completa en `dark` sin mezclas accidentales de tema.
- `light` conserva jerarquía, aire y acabado premium.
- Los toggles de `theme` y `locale` son visibles, coherentes y persistentes.
- No quedan strings críticos hardcodeados en español cuando la UI debe soportar `en`.
- `Clerk` ya no rompe la continuidad visual del producto.
- `anclora-talent` queda registrada como `Premium` en la bóveda y con sus contratos mínimos
  documentados en el repo.
