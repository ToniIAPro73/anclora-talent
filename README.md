<!-- markdownlint-disable MD001 MD013 MD033 MD041 MD060 -->

<div align="center">

<img src="./public/brand/anclora-talent.png" alt="Anclora Talent" width="132" />

# Anclora Talent

### Crea y publica proyectos editoriales con claridad

Plataforma premium para creación, edición y publicación de proyectos editoriales, con autenticación propia (credenciales + OAuth social).

**Español** · [English](./README.en.md)

<br />

![Anclora](https://img.shields.io/badge/Anclora-ecosystem-111827)
![Categoría](https://img.shields.io/badge/categoría-Premium%20(pausado)-C07860)
![Idiomas](https://img.shields.io/badge/idiomas-ES%20%7C%20EN-047857)

</div>

---

> [!IMPORTANT]
> **Proyecto en pausa** (fuera de alcance activo desde 2026-08). El contrato de marca sigue aplicando por si se reactiva. Repositorio interno: no publicar detalles operativos, credenciales ni lógica sensible fuera de canales autorizados.

## Qué es

Anclora Talent es una plataforma premium para crear, editar y publicar proyectos editoriales con claridad. Incluye autenticación propia (credenciales con bcrypt + sesiones opacas) y login social OAuth (Google, GitHub) implementado a mano con Authorization Code + PKCE, sin librerías OAuth externas.

## Categoría en el ecosistema

| Campo | Valor |
|---|---|
| Categoría | Premium |
| Estado | Pausado (desde 2026-08) |
| Acento de marca | `#4A9FD8` |
| Tipografía | DM Sans |
| Repositorio canónico | `anclora-talent` |

## Funcionalidades principales

- Creación, edición y publicación de proyectos editoriales
- Editor enriquecido (TipTap: color, imágenes, alineación, resaltado)
- Autenticación propia con credenciales (bcrypt) + sesiones en Neon
- Login social OAuth (Google, GitHub) con PKCE implementado a mano
- Exportación a PDF (@react-pdf/renderer, Chromium serverless)

## Stack tecnológico

| Área | Tecnología |
|---|---|
| Framework | Next.js, React |
| Editor | TipTap |
| Base de datos | Drizzle ORM, Neon |
| PDF | @react-pdf/renderer, @sparticuz/chromium |
| Validación | Zod |
| Testing | Vitest |

## Arranque local

```bash
npm install
npm run dev
```

## Idiomas soportados

- Español (predeterminado)
- English

## Documentación y gobernanza

- Contratos de marca y gobernanza: [`docs/standards/`](./docs/standards/) (copias derivadas; ver su README)
- Bóveda Anclora (autoridad delegada en contratos, branding y registry): `../boveda-anclora/contracts/` — registry en `../boveda-anclora/contracts/governance/contracts-registry.json`
- Gobernanza constitucional: AOS (`../anclora-governance/`); adopción y excepciones en [`.anclora/AOS_ADOPTION.md`](./.anclora/AOS_ADOPTION.md)

---

<div align="center">

### Anclora Group

Uso interno. Proyecto en pausa.

</div>
