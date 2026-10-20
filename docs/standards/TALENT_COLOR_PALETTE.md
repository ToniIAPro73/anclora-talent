# Anclora Talent Color Palette

> **Estado:** esta versión **sustituye a la paleta "deep teal + textured gold"** (acento oro
> `#D4AF37`) por mandato del `ANCLORA_BRANDING_MASTER_CONTRACT` (`docs/standards/ANCLORA_BRANDING_MASTER_CONTRACT.md`).
> El contrato maestro asigna a `anclora-talent` el acento **`#4A9FD8` (azul cielo, hue 205°)** con
> borde de grupo **cobre rosado `#C07860`**, y reserva el oro `#D4AF37` (hue 45°) a
> `anclora-nexus` y `anclora-private-estates`. Mantener el oro como acento estructural violaba la
> separación mínima de hue (30°) dentro del ecosistema. El oro queda **fuera** del branding de la
> app; solo puede sobrevivir como color de *contenido de documento* (paletas de export PDF/DOCX,
> presets de portada/contraportada), que no es branding de la aplicación.

## Objetivo

Fijar la paleta visual base de `Anclora Talent` como aplicación `Premium` del ecosistema
Anclora. Esta paleta debe sostener un producto `quiet luxury` oscuro por defecto, con un modo claro
diseñado y no derivado, manteniendo identidad propia frente a otras apps del grupo.

## Dirección visual

- `Anclora Talent` usa una gramática **azul cielo + teal profundo + navy**.
- El acento estructural único es **`#4A9FD8`** (focos, botones, auth, highlights, selección).
- El modo por defecto es `dark`.
- El modo `light` debe sentirse cálido y premium, no clínico (fondos `#F2F7FC`/`#FFFDF8`, no gris neutro).
- Tipografía contractual: **DM Sans** en toda la app (autohospedada vía `next/font/local`).

## Tokens oficiales (acento contractual)

Los mismos valores hex de acento aplican en **ambos temas** (dark y light):

| Token | Hex / Valor | Uso |
| --- | --- | --- |
| `--accent` | `#4A9FD8` | CTA principal, foco, highlights, selección, bordes activos |
| `--accent-hover` | `#5CB4E8` | Hover del acento |
| `--accent-dim` | `#3A88BE` | Variante profunda del acento (gradientes, bordes) |
| `--accent-soft` | `rgba(74,159,216,0.12)` dark / `0.10` light | Tintes suaves de fondo |
| `--accent-glow` | `rgba(74,159,216,0.10)` dark / `0.08` light | Glow ambiental |
| `--accent-border` | `rgba(74,159,216,0.30)` dark / `0.26` light | Bordes acentuados |
| `--accent-text` | `#4A9FD8` dark / `#2C729F` light | Acento como texto pequeño o icono (ver contraste) |
| `--text-on-accent` | `#081019` | Texto/foreground sobre fondos de acento |
| `--text-link` | `var(--accent)` dark / `#2C729F` light | Enlaces |

### Por qué `--accent-text` y `--text-link` difieren en light

`#4A9FD8` sobre superficies claras (`#FFFFFF`/`#F2F7FC`) alcanza solo ~2.9:1, por debajo del
mínimo 4.5:1 para texto. En el tema light el acento como **color de texto pequeño, iconos
significativos y enlaces** usa `#2C729F` (4.85:1 sobre `#F2F7FC`, 5.23:1 sobre `#FFFFFF`), mismo
hue 205°. El acento como **fondo** (botones, badges) sigue siendo `#4A9FD8` en ambos temas, con
foreground oscuro `#050b12`/`#081019` (6.8:1) — nunca texto blanco sobre el azul (2.9:1, rechazado).

## Tokens de soporte (dark por defecto)

| Token | Hex / Valor | Uso |
| --- | --- | --- |
| `--background` | `#0B313F` | Fondo dark base (teal-navy contractual) |
| `--surface-canvas` | `#0C141E` | Canvas navy profundo |
| `--surface` / `--card` / `--elevated` | `#111C28` / `#162535` / `#1C2E40` | Capas de panel |
| `--secondary` | `#A0D0F0` | Azul pálido secundario |
| `--text-primary` | `#EDF2F8` | Texto principal dark (16.4:1 sobre canvas) |
| `--text-secondary` | `#B0C4D8` | Texto secundario dark (10.3:1) |
| `--text-muted` | `#7090A8` | Texto terciario/decorativo |
| `--button-highlight-bg` | `var(--accent)` | Botón de acento |
| `--button-highlight-fg` | `#050b12` | Texto sobre botón de acento (6.8:1) |
| `--button-primary-bg` | `linear-gradient(135deg,#5CB4E8 0%,#4A9FD8 52%,#3A88BE 100%)` | CTA principal dark |
| `--button-primary-fg` | `#081019` | Texto del CTA principal dark |
| `--talent-button-selected-bg` | `#1E455C` | Selección/toggle activo dark |
| `--talent-button-selected-fg` | `#EDF2F8` | Texto de selección dark |
| `--premiumCopper` (marca) | `#C07860` | Borde de grupo Premium (uso puntual de marca, no acento UI) |

## Tokens de soporte (light diseñado)

| Token | Hex / Valor | Uso |
| --- | --- | --- |
| `--background` | `#F2F7FC` | Fondo light cálido-azulado |
| `--surface` / `--card` | `#FFFFFF` | Superficies principales |
| `--elevated` | `#E8F0F8` | Capa elevada |
| `--text-primary` | `#0C1820` | Texto principal light (18:1) |
| `--text-secondary` | `#3A5068` | Texto secundario light (8.3:1) |
| `--text-muted` | `#7898B0` | Texto terciario/decorativo |
| `--button-primary-bg` | `#C7DFE1` | Botón primario teal-azulado claro y desaturado |
| `--button-primary-fg` | `#12384A` | Texto navy sobre CTA teal-azulado (8.92:1) |
| `--talent-button-selected-bg` | `#DCECF7` | Selección/toggle activo light |
| `--talent-button-selected-fg` | `#12384A` | Texto de selección light (10.28:1) |

## Gradientes recomendados

### App dark

```css
radial-gradient(circle at top center, rgba(74,159,216,0.12), transparent 24%),
radial-gradient(circle at left, rgba(28,46,64,0.2), transparent 28%),
linear-gradient(180deg, #0C141E 0%, #111C28 48%, #0E1825 100%)
```

### CTA primario

```css
Dark: `linear-gradient(135deg, #5CB4E8 0%, #4A9FD8 52%, #3A88BE 100%)` con tinta `#081019`.

Light: `#C7DFE1` con texto `#12384A`. Mantiene un matiz teal-azulado suave, evita verdes oscuros
y reduce los grandes bloques azules saturados sobre las superficies claras.
```

### Glow azul

```css
rgba(74, 159, 216, 0.10)
```

### App light

```css
radial-gradient(circle at top center, rgba(74,159,216,0.10), transparent 24%),
radial-gradient(circle at left, rgba(228,237,245,0.5), transparent 28%),
linear-gradient(180deg, #F2F7FC 0%, #FFFFFF 52%, #E8F0F8 100%)
```

## Reglas de uso

- El **azul cielo `#4A9FD8`** se reserva para foco, highlights, enlaces y señal premium. Los CTA principales se adaptan al tema: degradado azul cielo con tinta navy en dark y teal-azulado claro con texto navy en light.
- El **teal profundo** (`#124a50`, gradientes `rgba(18,74,80,…)`) sostiene profundidad y variantes
  secundarias; nunca compite con el acento como CTA.
- El **navy** (`#0C141E`–`#1C2E40`) cierra el sistema en dark y evita que la app se sienta verde.
- Texto sobre el acento cielo: siempre foreground oscuro (`#050b12`/`#081019`); texto blanco sobre
  `#4A9FD8` no llega a 4.5:1 y está prohibido. El CTA light usa tinta navy sobre su fondo claro.
- Los toggles y controles seleccionados usan tokens distintos del CTA principal para reducir su
  peso visual y mantener clara la jerarquía de acciones.
- En light, texto pequeño/iconos/enlaces de acento usan `--accent-text` (`#2C729F`).
- El dark no debe caer en negro plano ni en gris neutro sin intención.
- El light no debe usar blanco puro dominante salvo superficies concretas justificadas.
- No introducir oro, morado ni verdes saturados como color dominante en `Anclora Talent`.
- El oro `#D4AF37`/`#C49A24` solo puede aparecer en **contenido de documento exportado**
  (paletas de portada/PDF/DOCX), nunca como acento estructural de la app.

## Contraste verificado (WCAG ≥ 4.5:1 en pares principales)

| Par | Ratio |
| --- | --- |
| dark: `--text-primary` sobre `--surface-canvas` | 16.45:1 |
| dark: `--text-primary` sobre `--background` | 12.23:1 |
| dark: `--accent` sobre `--surface-canvas` | 6.38:1 |
| dark: `--accent` sobre `--background` | 4.75:1 |
| dark/light: `--button-highlight-fg` `#050b12` sobre `--accent` | 6.81:1 |
| dark: texto `#081019` sobre cada parada del CTA `#5CB4E8`/`#4A9FD8`/`#3A88BE` | ≥4.96:1 |
| light: texto `#12384A` sobre CTA `#C7DFE1` | 8.92:1 |
| dark: selección `#EDF2F8` sobre `#1E455C` | 9.05:1 |
| light: selección `#12384A` sobre `#DCECF7` | 10.28:1 |
| dark/light: disabled `#8AA0B4`/`#526879` sobre `#162535`/`#E8F0F8` | ≥5.05:1 |
| dark/light: `#081019` sobre `--accent-hover` | 8.33:1 |
| light: `--text-primary` sobre `--surface` | 17.99:1 |
| light: `--text-secondary` sobre `--surface` | 8.31:1 |
| light: `--accent-text` `#2C729F` sobre `--background` | 4.85:1 |
| light: `--accent-text` `#2C729F` sobre `--surface` | 5.23:1 |

## Relación con el ecosistema

- `Anclora Talent` → acento `#4A9FD8` azul cielo (hue 205°), borde cobre rosado `#C07860`, DM Sans.
- `anclora-nexus` y `anclora-private-estates` → oro `#D4AF37` (hue 45°). Separación de hue con
  Talent: 160°, muy por encima del mínimo de 30°.
- `Anclora Command Center` sigue una dirección `azul-violeta tecnológica`; Talent se diferencia con
  un azul cielo más humano y cálido sobre navy/teal, sin caer en violeta.
