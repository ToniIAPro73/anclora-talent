# Standards y contratos en `docs/standards/`

## Proveniencia y precedencia

Los contratos y anexos de ecosistema en esta carpeta son **copias derivadas** de la Bóveda Anclora, que es la **fuente canónica** en su dominio delegado (contratos, branding, design tokens normativos): los contratos viven en `../boveda-anclora/contracts/` y los 4 anexos de branding en `../boveda-anclora/docs/standards/` (ubicación canónica declarada por Bóveda). Se conservan para consumo local/offline del repo.

- **La fuente canónica siempre prevalece.** En caso de divergencia entre una copia local y su fuente en Bóveda, gana la fuente y la copia debe re-sincronizarse.
- **Registry operativo de contratos**: `../boveda-anclora/contracts/governance/contracts-registry.json`.
- **Última sincronización verificada**: 2026-08-08 (diff copia ↔ fuente vacío en los 12 documentos con fuente canónica: 8 contratos + 4 anexos de branding).
- No añadir front-matter de proveniencia a cada contrato: este README es el mecanismo de proveniencia de la carpeta.

## Mapa copia → fuente canónica

| Copia local | Fuente canónica en Bóveda |
| --- | --- |
| `ANCLORA_BRANDING_MASTER_CONTRACT.md` | `contracts/core/ANCLORA_BRANDING_MASTER_CONTRACT.md` |
| `ANCLORA_ECOSYSTEM_CONTRACT_GROUPS.md` | `contracts/core/ANCLORA_ECOSYSTEM_CONTRACT_GROUPS.md` |
| `ANCLORA_GROUP_BRAND_IP_CONTRACT.md` | `contracts/core/ANCLORA_GROUP_BRAND_IP_CONTRACT.md` |
| `ANCLORA_PREMIUM_APP_CONTRACT.md` | `contracts/core/ANCLORA_PREMIUM_APP_CONTRACT.md` |
| `COOKIES_CONSENT_CONTRACT.md` | `contracts/logic/COOKIES_CONSENT_CONTRACT.md` |
| `LOCALIZATION_CONTRACT.md` | `contracts/logic/LOCALIZATION_CONTRACT.md` |
| `MODAL_CONTRACT.md` | `contracts/components/MODAL_CONTRACT.md` |
| `UI_MOTION_CONTRACT.md` | `contracts/components/UI_MOTION_CONTRACT.md` |
| `ANCLORA_BRANDING_COLOR_TOKENS.md` | `docs/standards/ANCLORA_BRANDING_COLOR_TOKENS.md` |
| `ANCLORA_BRANDING_FAVICON_SPEC.md` | `docs/standards/ANCLORA_BRANDING_FAVICON_SPEC.md` |
| `ANCLORA_BRANDING_ICON_SYSTEM.md` | `docs/standards/ANCLORA_BRANDING_ICON_SYSTEM.md` |
| `ANCLORA_BRANDING_TYPOGRAPHY.md` | `docs/standards/ANCLORA_BRANDING_TYPOGRAPHY.md` |

## Fuentes locales (no son copias)

- `TALENT_COLOR_PALETTE.md` — estándar visual propio de Talent; fuente local legítima, subordinada al `ANCLORA_BRANDING_MASTER_CONTRACT`.

## Desviaciones a revisar

- Ninguna activa. La excepción EX-TALENT-007 (anexos de branding sin fuente canónica registrada) quedó resuelta el 2026-08-08: Bóveda declaró `../boveda-anclora/docs/standards/` ubicación canónica de los 4 anexos y los registró en `contracts-registry.json`; ver `.anclora/AOS_ADOPTION.md`.
