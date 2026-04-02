# Anclora Premium App Contract

## Objetivo
Fijar una gramática premium compartida para productos públicos o semi-públicos que deben transmitir valor, criterio y confianza sin perder claridad operativa.

Ámbito:
- `anclora-impulso`
- `Boveda-Anclora/dashboard`
- `anclora-synergi`
- `anclora-data-lab`
- `anclora-talent`

## Invariantes de grupo

### 1. Dirección visual
- La identidad visual puede ser más editorial que en el grupo interno.
- Se permiten gradientes, glass, textura, overlays y tipografía con más intención de marca.
- La interacción crítica debe seguir siendo sobria y repetible.
- El primer viewport debe explicar rápido qué es la app y cuál es la siguiente acción.

### 2. Botones premium
- Deben existir las mismas familias semánticas que en internas:
  - `primary`
  - `secondary`
  - `ghost`
  - `destructive`
- El CTA principal puede tener mayor presencia visual, pero no debe monopolizar toda la lectura.
- No más de un CTA dominante por viewport principal.
- Los secundarios deben sentirse premium, no utilitarios sin remate.

### 3. Cards premium
- Se admite mayor profundidad visual que en el grupo interno.
- Requisitos obligatorios:
  - padding estable
  - jerarquía tipográfica clara
  - separación perceptible entre cards
  - hover medido
  - cero solapes o desplazamientos bruscos entre cards vecinas

### 4. Modales premium
- Se aplica `MODAL_CONTRACT.md`.
- Diferencias admitidas:
  - framing editorial
  - backdrop más trabajado
  - headline con mayor peso de marca
- No cambia:
  - cierre claro
  - footer accionable
  - control del scroll
  - coherencia de campos

### 5. Formularios y funnels
- Los formularios deben inspirar confianza antes que densidad.
- El usuario debe entender siempre:
  - qué se le pide
  - qué recibirá a cambio
  - cuál es el siguiente paso
- Los estados vacíos deben aportar contexto y valor, no sólo ausencia de datos.

### 6. Motion premium
- Motion más refinado que en el grupo interno.
- Permitido:
  - fade suave
  - rise corto
  - stagger breve
  - highlight narrativo contenido
- Prohibido:
  - bounce
  - retardos largos
  - transformaciones que dificulten lectura o click

### 7. Localización premium
- Se aplica `LOCALIZATION_CONTRACT.md`.
- El selector de idioma debe sentirse integrado en la marca.
- Las expansiones de texto no pueden degradar headings, pills, CTAs o formularios.

### 8. Tema premium
- Si la app soporta dos o más temas, cada modo debe sentirse diseñado, no derivado.
- Si la app usa un único tema editorial, los tokens base deben dejar abierta una futura extensión sin reescribir componentes.

## Reglas particulares por aplicación

### `Boveda-Anclora/dashboard`
- Forma parte del grupo premium.
- Debe mantener `es/en/de`.
- Debe mantener toggle visible de tema `dark/light`.
- Su gramática debe servir como dashboard premium de referencia, no como dashboard interno genérico.

### `anclora-synergi`
- Mantener identidad editorial propia.
- Mantener `es/en/de`.
- Puede operar con un único tema si el acabado es consistente y deliberado.
- Las superficies premium no deben caer en exceso de decoración ni sacrificar legibilidad.

### `anclora-data-lab`
- Mantener `es/en/de`.
- Mantener `dark/light/system`.
- Debe sentirse más analítica y precisa que Synergi, pero compartir la misma disciplina premium en botones, cards y modales.

### `anclora-talent`
- Mantener `es/en` con `es` como idioma por defecto.
- Mantener `dark/light` con `dark` como tema inicial.
- El shell autenticado debe exponer toggles visibles de tema e idioma integrados en la identidad premium.
- La experiencia debe sentirse como plataforma editorial premium coherente en `landing`, `sign-in`, `sign-up`, `dashboard`, `editor`, `preview` y `cover`.
- No puede parecer un dashboard interno con decoración aplicada encima.

## Gate de aceptación

Una feature premium no está lista si:
- parece un dashboard interno con capas cosméticas
- introduce un CTA dominante sin justificar la pantalla
- usa cards con hover espectáculo o layout inestable
- el modo alternativo parece una conversión incompleta
- el selector de idioma o tema rompe el acabado de marca
