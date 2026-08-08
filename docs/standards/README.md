# Standards y contratos en `docs/standards/`

## Proveniencia y precedencia

Los contratos de ecosistema en esta carpeta son **copias derivadas** de la Bóveda Anclora (`../boveda-anclora/contracts/`), que es la **fuente canónica** en su dominio delegado (contratos, branding, design tokens normativos). Se conservan para consumo local/offline del repo.

- **La fuente canónica siempre prevalece.** En caso de divergencia entre una copia local y su fuente en Bóveda, gana la fuente y la copia debe re-sincronizarse.
- **Registry operativo de contratos**: `../boveda-anclora/contracts/governance/contracts-registry.json`.
- **Última sincronización verificada**: 2026-08-08 (diff copia ↔ fuente vacío en los 8 contratos con fuente canónica).
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

## Fuentes locales (no son copias)

- `TALENT_COLOR_PALETTE.md` — estándar visual propio de Talent; fuente local legítima, subordinada al `ANCLORA_BRANDING_MASTER_CONTRACT`.

## Desviaciones a revisar

- `ANCLORA_BRANDING_COLOR_TOKENS.md`, `ANCLORA_BRANDING_FAVICON_SPEC.md`, `ANCLORA_BRANDING_ICON_SYSTEM.md`, `ANCLORA_BRANDING_TYPOGRAPHY.md` — el contrato maestro canónico los referencia como anexos, pero **no existe contraparte canónica** en `../boveda-anclora/contracts/` (verificado 2026-08-08). Se conservan como copias locales sin fuente que re-sincronizar; no editar salvo para alinear con el contrato maestro. Registrado como excepción EX-TALENT-007 en `.anclora/AOS_ADOPTION.md`; la resolución corresponde a Bóveda (publicar los anexos o declarar fuente local).
