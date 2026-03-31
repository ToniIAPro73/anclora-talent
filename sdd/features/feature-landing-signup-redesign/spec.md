# Feature: Landing Signup Redesign

## Objetivo

Rediseñar la landing publica de `Anclora Talent` para convertir mejor a registro, mejorar la
legibilidad en desktop y mobile, y elevar la percepcion de producto premium sin romper la
arquitectura actual basada en Next.js, Clerk y el flujo editorial existente.

## Contexto

La landing actual comunica sobre todo stack y estado tecnico. Eso penaliza comprension,
jerarquia visual y conversion. En esta fase la accion principal es `crear cuenta`, por lo que la
home debe vender con claridad el valor del producto y conducir de forma directa al alta.

## Resultado esperado

- Hero claro, legible y de alto contraste con CTA principal a `Crear cuenta`.
- Narrativa de producto orientada a resultado, no a infraestructura.
- Secciones conectadas al flujo real del producto: registro, proyecto, editor, preview y portada.
- Identidad visual premium alineada con el ecosistema Anclora.
- Landing adaptable a usuario anonimo y usuario autenticado sin duplicar experiencias.

## Archivos previstos

- Modificar `src/app/page.tsx`
- Modificar `src/app/layout.tsx`
- Modificar `src/app/globals.css`
- Crear `src/components/marketing/landing-hero.tsx`
- Crear `src/components/marketing/landing-proof-strip.tsx`
- Crear `src/components/marketing/landing-workflow.tsx`
- Crear `src/components/marketing/landing-product-showcase.tsx`
- Crear `src/components/marketing/landing-benefits.tsx`
- Crear `src/components/marketing/landing-final-cta.tsx`
- Crear `src/components/marketing/marketing-data.ts`

## Dependencias

- `feature-nextjs-platform-migration`
- `feature-canonical-document`
- `feature-runtime-validation`

## Riesgos

- Quedarse en una pagina mas vistosa pero sin mejora real de conversion.
- Sobreexplicar stack o arquitectura y volver a perder foco comercial.
- Introducir demasiado JS o composiciones visuales que degraden legibilidad o rendimiento.
- Desalinear la home del flujo autenticado actual si las CTAs no respetan estado de sesion.

## Arquitectura propuesta

La landing seguira siendo un server component en `src/app/page.tsx`, responsable solo de:

- resolver el estado de autenticacion con Clerk
- componer secciones de marketing desacopladas
- mapear CTAs segun sesion (`/sign-up` para anonimo, `/dashboard` para autenticado)

Las secciones visuales se moveran a `src/components/marketing/` para reducir complejidad,
mejorar mantenibilidad y permitir evolucion posterior sin convertir `page.tsx` en un archivo
monolitico.

## Estructura de secciones

### 1. Hero

- headline orientado a valor editorial y velocidad de arranque
- subheadline que explique en una frase que el usuario puede crear, estructurar y publicar
- CTA principal a `Crear cuenta`
- CTA secundario a `Ver plataforma` o `Ir al dashboard` segun sesion
- composicion visual de producto con capas editor, preview y portada

### 2. Proof Strip

- tres señales de confianza honestas y ligadas al producto actual
- enfoque en persistencia, flujo editorial y autenticacion real

### 3. Workflow

- secuencia en tres pasos:
  - crea tu cuenta
  - lanza tu proyecto
  - edita y publica

### 4. Product Showcase

- bloque central que haga tangible el sistema
- relacion visible entre documento canonico, preview y portada
- copy que explique la promesa operativa del producto

### 5. Benefits

- beneficios redactados como outcomes
- evitar lenguaje de features aisladas o detalles de implementacion

### 6. Final CTA

- cierre fuerte con baja friccion
- repeticion del CTA principal y recordatorio del primer resultado esperado

## Sistema visual

- subir contraste y profundidad de fondo respecto a la version actual
- jerarquia tipografica mucho mas marcada
- superficies editoriales premium, no tarjetas genericas de dashboard
- palette compatible con Anclora, pero con uso mas decidido de luces, sombras y acentos
- mobile-first: el CTA principal debe quedar visible sin depender de scroll largo

## Copy y conversion

- framework principal: `AIDA` con tono premium y directo
- un solo objetivo primario por viewport: llevar a registro
- reducir friccion semantica:
  - no abrir con stack
  - no abrir con terminos internos del sistema
  - no vender "infraestructura", vender capacidad

## SEO y metadata

- ajustar `title` y `description` para reflejar mejor el producto
- reforzar H1 unico y semantica de secciones
- preparar la pagina para futura ampliacion con FAQ o schema sin introducirlo aun si no hay
  contenido suficientemente honesto

## Testing y validacion

- tests de comportamiento minimo para CTAs segun estado de sesion o extraccion de helpers si
  se decide aislar logica
- `npm run lint`
- `npm test`
- `npm run build`
- validacion visual en navegador de:
  - desktop
  - mobile
  - contraste
  - continuidad de CTAs

## Criterio de salida

- la landing deja de parecer una demo tecnica y pasa a comportarse como una home de producto
- el CTA principal a registro domina claramente la pagina
- la informacion clave se entiende en menos de cinco segundos
- no hay regresiones de build, lint ni tests
- la composicion visual mantiene legibilidad real en desktop y mobile
