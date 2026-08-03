<!-- markdownlint-disable MD001 MD013 MD033 MD041 MD060 -->

<div align="center">

<img src="./public/brand/anclora-talent.png" alt="Anclora Talent" width="132" />

# Anclora Talent

### Create and publish editorial projects with clarity

Premium platform for creating, editing, and publishing editorial projects, with its own authentication (credentials + social OAuth).

[Español](./README.md) · **English**

<br />

![Anclora](https://img.shields.io/badge/Anclora-ecosystem-111827)
![Category](https://img.shields.io/badge/category-Premium%20(paused)-C07860)
![Languages](https://img.shields.io/badge/languages-ES%20%7C%20EN-047857)

</div>

---

> [!IMPORTANT]
> **Project paused** (out of active scope since 2026-08). The brand contract still applies in case it is reactivated. Internal repository: do not publish operational details, credentials, or sensitive logic outside authorized channels.

## What it is

Anclora Talent is a premium platform for creating, editing, and publishing editorial projects with clarity. It includes its own authentication (bcrypt credentials + opaque sessions) and social OAuth login (Google, GitHub) hand-implemented with Authorization Code + PKCE, without external OAuth libraries.

## Category in the ecosystem

| Field | Value |
|---|---|
| Category | Premium |
| Status | Paused (since 2026-08) |
| Brand accent | `#4A9FD8` |
| Typography | DM Sans |
| Canonical repository | `anclora-talent` |

## Key features

- Creation, editing, and publishing of editorial projects
- Rich text editor (TipTap: color, images, alignment, highlight)
- Own credential authentication (bcrypt) + sessions in Neon
- Social OAuth login (Google, GitHub) with hand-implemented PKCE
- PDF export (@react-pdf/renderer, serverless Chromium)

## Technology stack

| Area | Technology |
|---|---|
| Framework | Next.js, React |
| Editor | TipTap |
| Database | Drizzle ORM, Neon |
| PDF | @react-pdf/renderer, @sparticuz/chromium |
| Validation | Zod |
| Testing | Vitest |

## Local setup

```bash
npm install
npm run dev
```

## Supported languages

- Español (default)
- English

## Documentation and governance

- Brand and governance contracts: [`docs/standards/`](./docs/standards/)
- Anclora Vault (source of truth): `contracts/` and `docs/governance/`

---

<div align="center">

### Anclora Group

Internal use. Project paused.

</div>
