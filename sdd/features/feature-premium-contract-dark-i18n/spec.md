# Feature: Premium Contract Dark Theme and Localization Alignment

## Objetivo

Elevar `Anclora Talent` al grupo de aplicaciones `Premium` del ecosistema Anclora, unificando la
experiencia completa bajo un contrato visual premium con `dark mode` por defecto, soporte real de
idioma `es/en`, y controles visibles de tema e idioma en el shell autenticado.

## Contexto

La app ya dispone de una base funcional con landing, autenticación, dashboard, editor, preview y
cover studio. Sin embargo, todavía presenta gaps claros respecto al marco contractual del
ecosistema:

- mezcla de superficies claras y oscuras sin una dirección visual única
- `Clerk` tematizado con una gramática distinta de la app
- ausencia de un sistema visible y persistente de `theme` y `locale`
- presencia de strings hardcodeados que impiden cumplir el contrato de localización
- ausencia de `Anclora Talent` en la clasificación y matriz contractual de la bóveda

La feature debe resolver estos gaps sin romper el flujo editorial ya operativo ni introducir una
reconstrucción innecesaria del producto.

## Contratos aplicables

### Bóveda

- `docs/standards/ANCLORA_ECOSYSTEM_CONTRACT_GROUPS.md`
- `docs/standards/ANCLORA_PREMIUM_APP_CONTRACT.md`
- `docs/standards/UI_MOTION_CONTRACT.md`
- `docs/standards/LOCALIZATION_CONTRACT.md`
- `docs/governance/CONTRACT_CONDITION_CATALOG.md`
- `docs/governance/CONTRACT_COMPLIANCE_MATRIX.md`

### Condiciones objetivo

- `M1-M6`: coherencia de motion, hover, focus y validación visual
- `L1-L5`: localización real, sin mezcla de idiomas ni toggles cosméticos
- `P1-P5`: tratamiento premium consistente, densidad controlada, ritmo visual, tono premium y
  controles superiores integrados

## Resultado esperado

- Toda la app abre en `dark mode` por defecto.
- El usuario autenticado dispone de:
  - toggle visible de `theme`
  - toggle visible de `language`
- El `locale` soportado queda fijado a `es/en`, con `es` por defecto.
- `sign-in` y `sign-up` usan la misma gramática premium que el resto del producto.
- Landing, auth, dashboard, editor, preview y cover comparten tokens y semántica visual.
- `Anclora Talent` queda clasificada como aplicación `Premium` en la bóveda.
- La matriz de cumplimiento refleja el estado real de la app tras esta ronda.

## Fuera de alcance

- Añadir un tercer idioma (`de`) en esta fase
- Crear un modo `system`
- Rediseñar el modelo editorial o los flujos de datos de proyectos
- Exportar nuevos formatos o cambiar la lógica de importación
- Introducir overrides `Ultra Premium`

## Archivos previstos

### Repo `anclora-talent`

- Modificar `src/app/layout.tsx`
- Modificar `src/app/globals.css`
- Modificar `src/app/page.tsx`
- Modificar `src/app/sign-in/[[...sign-in]]/page.tsx`
- Modificar `src/app/sign-up/[[...sign-up]]/page.tsx`
- Modificar `src/app/(app)/layout.tsx`
- Modificar `src/app/(app)/dashboard/page.tsx`
- Modificar `src/app/(app)/projects/[projectId]/editor/page.tsx`
- Modificar `src/app/(app)/projects/[projectId]/preview/page.tsx`
- Modificar `src/app/(app)/projects/[projectId]/cover/page.tsx`
- Modificar `src/components/layout/AppShell.tsx`
- Modificar `src/components/auth/clerkAppearance.ts`
- Modificar `src/components/marketing/*` donde aplique para alinear tema base
- Modificar `src/components/projects/*` donde haya strings o superficies fuera de contrato
- Crear `src/lib/ui/preferences.ts`
- Crear `src/lib/ui/preferences.test.ts`
- Crear `src/lib/i18n/catalog.ts`
- Crear `src/lib/i18n/catalog.test.ts`
- Crear `src/components/layout/ThemeToggle.tsx`
- Crear `src/components/layout/LocaleToggle.tsx`
- Crear `src/components/layout/AppShell.test.tsx`
- Crear `docs/standards/ANCLORA_PREMIUM_APP_CONTRACT.md`
- Crear `docs/standards/UI_MOTION_CONTRACT.md`
- Crear `docs/standards/LOCALIZATION_CONTRACT.md`
- Crear `docs/standards/ANCLORA_ECOSYSTEM_CONTRACT_GROUPS.md`

### Repo `Boveda-Anclora`

- Modificar `docs/standards/ANCLORA_ECOSYSTEM_CONTRACT_GROUPS.md`
- Modificar `docs/governance/CONTRACT_COMPLIANCE_MATRIX.md`
- Modificar las notas canónicas de `Anclora Talent` si hace falta para reflejar su familia premium

## Dependencias

- `feature-landing-signup-redesign`
- `feature-runtime-validation`
- configuración Clerk staging ya funcional

## Arquitectura propuesta

### 1. Capa de preferencias de UI

Se añadirá una capa mínima de preferencias de interfaz con dos ejes:

- `theme`: `dark | light`
- `locale`: `es | en`

Estas preferencias se resolverán en el layout y se persistirán entre pantallas. La persistencia
puede usar `cookies` para que el shell server-first conozca el estado en navegación inicial, con
apoyo de un cliente ligero para actualización inmediata de la UI.

### 2. Tokens globales y superficies duales diseñadas

`globals.css` dejará de tener sólo una base clara y pasará a definir tokens de `dark` y `light`.
La UI premium partirá de `dark` como modo inicial. El modo claro no será una simple inversión
automática, sino una variante diseñada usando los mismos tokens semánticos:

- fondo
- foreground
- surface
- surface elevated
- border
- accent
- muted text
- card glow / shadow

### 3. Shell premium con toggles visibles

`AppShell` incorporará en su topbar:

- toggle de tema
- toggle de idioma
- `UserButton`

Estos controles deben sentirse integrados en la identidad premium de la app y no como controles de
utilidad genéricos. Deben ser visibles, consistentes entre pantallas y compatibles con desktop y
mobile.

### 4. Localización real de shell y flujos principales

Se creará un catálogo mínimo `es/en` para:

- navegación
- títulos del shell
- auth framing copy
- dashboard hero
- acciones principales
- labels compartidos de editor, preview y cover

La feature no exige traducir exhaustivamente cada bloque editorial ya generado por usuarios, pero sí
el producto y la interfaz. El objetivo es cumplir `L1-L4` y dejar el camino preparado para `L5`
con revisión visual en ambos idiomas.

### 5. Clerk alineado al contrato premium

`clerkAppearance` se reescribirá sobre tokens del sistema premium para evitar una gramática visual
paralela. `sign-in` y `sign-up` deberán poder vivir correctamente en ambos temas, manteniendo:

- alto contraste
- continuidad de branding
- campos y CTA coherentes con la app

### 6. Propagación contractual a bóveda y repo

La bóveda se actualizará para incluir `anclora-talent` en la familia `Premium` con:

- idiomas objetivo `es/en`
- tema objetivo `dark/light`
- estado de cumplimiento inicial actualizado tras esta ronda

El repo `anclora-talent` deberá contener copia local de los contratos que le aplican, tal como
marca el contrato de ecosistema.

## UX esperada por superficie

### Landing pública

- Mantiene naturaleza premium pública
- Arranca en `dark`
- No mezcla visualmente bloques claros y oscuros sin intención estructural
- Conserva foco de conversión a registro

### Sign-in / Sign-up

- Shell premium oscura por defecto
- Formulario integrado en el sistema visual
- CTA y campos con contraste consistente
- Copy `es/en` según preferencia activa

### Dashboard

- Topbar premium con toggles visibles
- Hero, cards y formulario de creación bajo el mismo sistema
- Sin mezcla accidental de contenedores claros sobre shell oscuro

### Editor / Preview / Cover

- Continuidad total del shell
- Textos de producto localizados
- Superficies coordinadas con el tema activo
- Controles superiores consistentes con dashboard

## Riesgos

- Convertir el modo claro en una variante incompleta y romper `P3`
- Añadir i18n superficial y no cumplir `L1-L4`
- Introducir demasiada lógica cliente para preferencias que deberían poder resolverse en el shell
- Duplicar tokens y volver a crear una deuda visual entre `Clerk`, marketing y workspace
- Actualizar la app sin propagar clasificación y cumplimiento a la bóveda

## Testing y validación

- tests unitarios de resolución y persistencia de preferencias
- tests del catálogo `es/en`
- tests del shell para visibilidad y comportamiento de toggles
- `npm run test:run`
- `npm run lint`
- `npm run build`
- validación visual en navegador de:
  - landing
  - sign-in
  - sign-up
  - dashboard
  - editor
  - preview
  - cover
  - desktop y mobile
  - `es` y `en`
  - `dark` y `light`

## Criterio de salida

La feature se considera cerrada sólo si:

- `Anclora Talent` se comporta como app `Premium` del ecosistema
- el modo `dark` es el arranque por defecto de toda la app
- existe `light` usable y diseñado
- el selector `es/en` es visible y funcional
- no hay mezcla accidental de idiomas ni de contratos visuales
- la bóveda y el repo quedan alineados respecto a familia, contratos y cumplimiento
