# AOS Adoption Declaration

Declaración de adopción AOS para `anclora-talent`.

## Metadatos

- Repository Name: anclora-talent
- Repository Owner: AOS Chief Architect
- Adoption Status: Adopted With Exceptions
- AOS Version: v0.2.0
- Adoption Date: 2026-08-08
- Last Reviewed: 2026-08-08
- Governance Level: GL-1

## Propósito del repositorio

`anclora-talent` es una aplicación premium del ecosistema Anclora para creación, edición, composición, previsualización y exportación de proyectos editoriales.

El repositorio está actualmente en pausa desde 2026-08, pero conserva arquitectura, documentación, workflows, estándares locales y memoria técnica que deben quedar subordinados al AOS.

## Fuentes AOS referenciadas

Enlaza las fuentes oficiales AOS que gobiernan este repositorio:

- Constitution: [`../../anclora-governance/constitution/README.md`](../../anclora-governance/constitution/README.md)
- MASTER_DECISIONS: [`../../anclora-governance/knowledge/MASTER_DECISIONS.md`](../../anclora-governance/knowledge/MASTER_DECISIONS.md)
- CURRENT_STATE: [`../../anclora-governance/knowledge/CURRENT_STATE.md`](../../anclora-governance/knowledge/CURRENT_STATE.md)
- SOURCE_OF_TRUTH_REGISTRY: [`../../anclora-governance/knowledge/SOURCE_OF_TRUTH_REGISTRY.md`](../../anclora-governance/knowledge/SOURCE_OF_TRUTH_REGISTRY.md)
- Standards: [`../../anclora-governance/standards/README.md`](../../anclora-governance/standards/README.md)
- Playbooks: [`../../anclora-governance/playbooks/README.md`](../../anclora-governance/playbooks/README.md)
- Templates: [`../../anclora-governance/templates/README.md`](../../anclora-governance/templates/README.md)

## Fuentes oficiales locales

Declara qué conocimiento mantiene este repositorio como fuente oficial local.

| Tipo de conocimiento | Ruta local | Owner | Relación con AOS |
| --- | --- | --- | --- |
| Identidad y estado del producto | [`../README.md`](../README.md) | AOS Chief Architect | Fuente local subordinada a AOS. |
| Traducción del README | [`../README.en.md`](../README.en.md) | AOS Chief Architect | Traducción subordinada a `README.md`. |
| Contexto de agente del repositorio | [`AGENT_PROJECT_CONTEXT.md`](AGENT_PROJECT_CONTEXT.md) | AOS Chief Architect | Fuente local subordinada al protocolo AOS de agentes. |
| Reglas locales de agentes | [`../AGENTS.md`](../AGENTS.md) | AOS Chief Architect | Fuente local subordinada a AOS; bootstrap alineado con el modelo de 3 niveles. |
| Memoria técnica local | [`../MEMORY.md`](../MEMORY.md) | AOS Chief Architect | Fuente local histórica/subordinada. |
| Producto | [`../sdd/product.md`](../sdd/product.md) | AOS Chief Architect | Fuente local de alcance de producto. |
| Arquitectura local | [`../sdd/architecture.md`](../sdd/architecture.md) | AOS Chief Architect | Fuente local de arquitectura de aplicación. |
| Modelo de datos local | [`../sdd/data-model.md`](../sdd/data-model.md) | AOS Chief Architect | Fuente local de modelo de datos. |
| Roadmap local | [`../sdd/roadmap.md`](../sdd/roadmap.md) | AOS Chief Architect | Roadmap de producto subordinado al roadmap AOS. |
| Motor de composición | [`../sdd/composition-engine.md`](../sdd/composition-engine.md) | AOS Chief Architect | Fuente local de arquitectura del motor de composición. |
| Features y decisiones locales de producto | [`../sdd/features/`](../sdd/features/) | AOS Chief Architect | Registros locales subordinados; no sustituyen decisiones AOS. |
| Integración FileStudio | [`../sdd/integrations/filestudio/`](../sdd/integrations/filestudio/) | AOS Chief Architect | Fuente local de integración; decisiones transversales deben elevarse a AOS. |
| Estándar visual propio de Talent | [`../docs/standards/TALENT_COLOR_PALETTE.md`](../docs/standards/TALENT_COLOR_PALETTE.md) | AOS Chief Architect | Fuente local específica de Talent, subordinada a AOS. |
| Workflows CI/promoción | [`../.github/workflows/`](../.github/workflows/) | AOS Chief Architect | Fuente local de operación GitHub; no define gobierno AOS. |
| Credenciales de prueba | [`../memory/test_credentials.md`](../memory/test_credentials.md) | AOS Chief Architect | Documento local de pruebas; contiene credenciales fake/test-only y debe permanecer tratado como sensitive-adjacent. |
| Package metadata | [`../package.json`](../package.json) | AOS Chief Architect | Fuente técnica local para scripts, dependencias y versión de paquete. |

## Política de decisiones locales

Las decisiones locales de producto (PD) de `anclora-talent` tienen como fuente canónica el SDD local: specs, planes y reviews bajo:

- [`../sdd/features/`](../sdd/features/)
- [`../sdd/integrations/`](../sdd/integrations/)

[`../MEMORY.md`](../MEMORY.md) y [`../Archive/docs/`](../Archive/docs/) son memoria operativa e histórica (registro narrativo de desarrollo): aportan contexto, pero no son fuente normativa, no crean ED/OD/PD/EX y no prevalecen sobre contratos, el SDD, esta declaración ni ninguna fuente canónica; en caso de contradicción, prevalece la fuente canónica.

Estas decisiones son subordinadas a AOS.

Una decisión local debe elevarse a AOS cuando:

- afecta a más de un repositorio;
- redefine una fuente oficial;
- modifica criterios de agentes, estándares, playbooks, prompts, templates, automation o aplicaciones;
- contradice o tensiona una decisión activa AOS;
- depende de una futura fuente central como Anclora Vault.

## Excepciones y desviaciones

Declara excepciones conocidas. Ciclo de vida: `OPEN → ACCEPTED → RESOLVED`. Sin regla universal de caducidad: cada excepción define su trigger de revisión o condición de resolución.

| ID | Regla afectada | Razón | Owner | Status | Creada | Trigger de revisión | Resolución |
| --- | --- | --- | --- | --- | --- | --- | --- |
| EX-TALENT-001 | Referencias legacy a `Boveda-Anclora` como fuente canónica genérica en `README.md`, `README.en.md`, `.anclora/AGENT_PROJECT_CONTEXT.md`, `AGENTS.md` y `MEMORY.md`. | AOS v0.2.0 fue creado después de esa gobernanza legacy. | AOS Chief Architect | RESOLVED | 2026-08-08 | — | Resuelta 2026-08-08: bootstrap reescrito con el modelo de 3 niveles; Bóveda referenciada como autoridad delegada en sus dominios con rutas corregidas; no quedan referencias legacy en los documentos de entrada. |
| EX-TALENT-002 | Contratos de ecosistema copiados en `docs/standards/` (8 con fuente canónica en Bóveda). | Copias operativas para consumo local/offline. | AOS Chief Architect | RESOLVED | 2026-08-08 | — | Resuelta 2026-08-08: las 6 copias divergentes se re-sincronizaron con la fuente canónica (diff copia ↔ fuente vacío en las 8); proveniencia, precedencia y ruta correcta del registry declaradas en `docs/standards/README.md` (mecanismo ligero, sin front-matter masivo). |
| EX-TALENT-003 | `AGENTS.md` define workflow local y referencias a guías externas legacy. | Preexiste al protocolo AOS de agentes. | AOS Chief Architect | RESOLVED | 2026-08-08 | — | Resuelta 2026-08-08: referencias rotas a guías externas inexistentes eliminadas; el workflow local queda declarado subordinado al bootstrap AOS/Bóveda como autoridad local por defecto. |
| EX-TALENT-004 | `.agent/skills/anclorabot-multiagente-system/SKILL.md` describe `anclora-synergi`, no Talent. | Artefacto local heredado o mal ubicado. | AOS Chief Architect | ACCEPTED | 2026-08-08 | Cleanup de artefactos locales autorizado. | Mantener sin uso; no implementar Skills. Resolver eliminando o reubicando el artefacto cuando se autorice el cleanup. |
| EX-TALENT-005 | `memory/test_credentials.md` contiene credenciales fake/test-only y placeholders OAuth. | Necesario para E2E y documentado como no real. | AOS Chief Architect | ACCEPTED | 2026-08-08 | El repo se hace público o rota el entorno de pruebas. | Mantener como sensitive-adjacent; no publicar fuera de canales internos. |
| EX-TALENT-006 | Working tree contiene `pnpm-lock.yaml` y `pnpm-workspace.yaml` untracked. | Estado Git preexistente no relacionado con adopción. | AOS Chief Architect | ACCEPTED | 2026-08-08 | Tarea separada de package manager/dependencias. | No incluir en adopción ni en remediación de gobernanza; resolver por tarea separada. |
| EX-TALENT-007 | `docs/standards/` contiene 4 anexos de branding (`ANCLORA_BRANDING_COLOR_TOKENS`, `ANCLORA_BRANDING_FAVICON_SPEC`, `ANCLORA_BRANDING_ICON_SYSTEM`, `ANCLORA_BRANDING_TYPOGRAPHY`) referenciados por el `ANCLORA_BRANDING_MASTER_CONTRACT` canónico, cuya fuente canónica no estaba canonizada ni registrada en Bóveda. | Defecto de registro/canonización en Bóveda, no de existencia: el contenido de los anexos ya existía (verificado 2026-08-08). | AOS Chief Architect | RESOLVED | 2026-08-08 | — | Resuelta 2026-08-08: Bóveda declara `../boveda-anclora/docs/standards/` ubicación canónica de los 4 anexos, los registra en `contracts/governance/contracts-registry.json` y el contrato maestro canónico apunta a ellos. Las copias locales de Talent en `docs/standards/` son copias sincronizadas bajo la política copy/reference (proveniencia en `docs/standards/README.md`), verificadas idénticas byte-a-byte a la fuente canónica por auditoría el 2026-08-08. |

## Política de upgrade AOS

`anclora-talent` revisará nuevas versiones de AOS cuando:

- AOS publique una nueva release;
- cambien Constitución, decisiones, registro de fuentes oficiales o estándares aplicables;
- se reactive el producto;
- se modifiquen agentes, workflows, arquitectura local, integraciones o documentación de gobierno.

El upgrade debe:

1. Revisar release notes de AOS.
2. Revisar decisiones AOS nuevas o modificadas.
3. Actualizar `AOS Version` si adopta la nueva versión.
4. Registrar excepciones si no puede actualizar.
5. Elevar conflictos a AOS si afectan a más de un repositorio.

## Historial de adopción

| Fecha | AOS Version | Cambio | Owner |
| --- | --- | --- | --- |
| 2026-08-08 | v0.2.0 | Declaración inicial de adopción retrospectiva con excepciones. | AOS Chief Architect |
| 2026-08-08 | v0.2.0 | Revisión de remediación: bootstrap y lenguaje de autoridad alineados con el modelo de 3 niveles; EX-TALENT-001/002/003 resueltas; EX-TALENT-007 abierta (anexos de branding sin fuente canónica en Bóveda). | AOS Chief Architect |
| 2026-08-08 | v0.2.0 | EX-TALENT-007 resuelta: Bóveda declara `docs/standards/` ubicación canónica de los 4 anexos de branding y los registra en `contracts-registry.json`; copias locales verificadas idénticas a la fuente. `MEMORY.md` reclasificado como memoria histórica no normativa en `AGENTS.md` y en la política de decisiones locales (PD: fuente canónica `sdd/`). | AOS Chief Architect |

## Documentos relacionados

- [`../README.md`](../README.md)
- [`../AGENTS.md`](../AGENTS.md)
- [`../MEMORY.md`](../MEMORY.md)
- [`../sdd/architecture.md`](../sdd/architecture.md)
- [`../sdd/product.md`](../sdd/product.md)
- [`../sdd/roadmap.md`](../sdd/roadmap.md)
- [`../docs/standards/TALENT_COLOR_PALETTE.md`](../docs/standards/TALENT_COLOR_PALETTE.md)
