# Anclora Talent Color Palette

## Objetivo

Fijar la paleta visual base de `Anclora Talent` como aplicación `Premium` del ecosistema
Anclora. Esta paleta debe sostener un producto `quiet luxury` oscuro por defecto, con un modo claro
diseñado y no derivado, manteniendo identidad propia frente a otras apps del grupo.

## Dirección visual

- `Anclora Talent` usa una gramática `deep teal + textured gold + navy`.
- El modo por defecto es `dark`.
- El modo `light` debe sentirse cálido y premium, no clínico.
- El color emocional principal es `gold premium`, no violeta ni verde saturado.

## Tokens oficiales

| Token | Hex / Valor | Uso |
| --- | --- | --- |
| `--talent-accent-primary` | `#D4AF37` | CTA principal, highlights premium, foco |
| `--talent-accent-primary-hover` | `#ECC768` | Hover del CTA principal |
| `--talent-accent-strong` | `#124A50` | Panel premium, acento estructural |
| `--talent-ink` | `#0B1320` | Texto sobre oro y contraste fuerte |
| `--talent-bg-dark` | `#0B313F` | Fondo dark base |
| `--talent-bg-dark-start` | `#07252F` | Inicio de gradiente global dark |
| `--talent-bg-dark-end` | `#0B133F` | Fin de gradiente global dark |
| `--talent-surface-dark` | `#124A50` | Cards y paneles principales dark |
| `--talent-surface-dark-alt` | `#07252F` | Segunda capa de profundidad dark |
| `--talent-text-dark-primary` | `#F2E3B3` | Texto principal en dark |
| `--talent-text-dark-secondary` | `rgba(242,227,179,0.76)` | Texto secundario en dark |
| `--talent-border-dark` | `rgba(212,175,55,0.14)` | Bordes sutiles en dark |
| `--talent-bg-light` | `#F5ECDA` | Fondo light base |
| `--talent-surface-light` | `#FFFDF8` | Surface principal light |
| `--talent-surface-light-alt` | `#F0E6CF` | Surface secundaria light |
| `--talent-text-light-primary` | `#0B313F` | Texto principal en light |
| `--talent-text-light-secondary` | `rgba(11,49,63,0.76)` | Texto secundario en light |
| `--talent-border-light` | `rgba(11,49,63,0.12)` | Bordes sutiles en light |

## Gradientes recomendados

### Hero y shell dark

```css
linear-gradient(180deg, #07252F 0%, #0B313F 48%, #0B133F 100%)
```

### Panel premium dark

```css
linear-gradient(180deg, #124A50 0%, #07252F 100%)
```

### Glow mint

```css
rgba(212, 175, 55, 0.22)
```

### Surface editorial light

```css
linear-gradient(180deg, #FFFDF8 0%, #F0E6CF 100%)
```

## Reglas de uso

- El `gold` se reserva para acciones importantes, foco, highlights y señal premium.
- El `deep teal` sostiene shell, paneles y profundidad visual.
- El `navy` cierra el sistema en dark y evita que la app se sienta verde.
- El dark no debe caer en negro plano ni en gris neutro sin intención.
- El light no debe usar blanco puro dominante salvo superficies concretas justificadas.
- No introducir morado ni verdes saturados como color dominante en `Anclora Talent`.

## Relación con el ecosistema

- `Anclora Command Center` sigue una dirección `azul-violeta tecnológica`.
- `Anclora Talent` debe diferenciarse con una dirección más humana, sofisticada y `quiet luxury`.
- Puede compartir disciplina premium de contraste, profundidad y glow, pero no debe parecer una
  variación cromática directa del dashboard de la bóveda.
