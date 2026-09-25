# Anclora Talent — Agent Project Context

AGENT_PROJECT_CONTEXT_VERSION=2.0
STATUS=ACTIVE

ANCLORA_AUTHORITY_MODEL_VERSION=1.0
ANCLORA_PROJECT_RULES_OVERRIDE_AGENT_DEFAULTS=true
ANCLORA_PROJECT_RULES_OVERRIDE_HOME_AGENT_CONFIG=true
ANCLORA_PROJECT_RULES_OVERRIDE_GENERIC_BEST_PRACTICES=true
AGENT_HOME_CONFIG_IS_SUBORDINATE=true
AGENT_GENERIC_DEFAULTS_ARE_SUBORDINATE=true
IMMUTABLE_PLATFORM_CONSTRAINTS_REMAIN_SUPERIOR=true

ON_AGENT_RULE_CONFLICT=FOLLOW_ANCLORA
ON_GENERIC_DEFAULT_CONFLICT=FOLLOW_ANCLORA
ON_HOME_CONFIG_CONFLICT=FOLLOW_ANCLORA
ON_PLATFORM_CONSTRAINT_CONFLICT=REPORT_AND_STOP_AFFECTED_ACTION

## 1. Project Identity

APPLICATION_NAME=Anclora Talent
REPOSITORY=anclora-talent
PROJECT_ROLE=Application (Interactive Editorial Creation, Composition & Publishing Platform)
PRODUCT_FAMILY=Anclora Group (Premium Prosumer / Editorial Tools)

Anclora Talent is a premium application within the Anclora ecosystem designed for
the creation, editing, visual composition, previewing, and export of high-end
editorial publications, covers, and books.

## 2. Mandatory Bootstrap

When starting work in this repository, agents must read sources in this exact order:

1. Current explicit instruction from Toni (highest operational priority).
2. Workspace agent policy (`../../ANCLORA_WORKSPACE_AGENT_POLICY.md` — currently `WORKSPACE_POLICY_STATUS=PENDING_GLOBAL_INSTALLATION`, with `../../AGENTS.md` as interim workspace guidance).
3. Repository agent rules (`../AGENTS.md`).
4. `.anclora/AGENT_PROJECT_CONTEXT.md` (this file — bootstrap, index, routing, and authority map).
5. `.anclora/PRODUCTION_RUNTIME.md` (canonical runtime contract: topology, database, migrations, QA, Git).
6. `.anclora/AOS_ADOPTION.md` (governance declaration, canonical AOS sources, decisions, exceptions).
7. Repository-specific agent instructions (`../CLAUDE.md`, `../GEMINI.md`, etc., when present).
8. Task-specific canonical sources (see Section 4: Task Routing).

*Note: `AGENTS.md` references this file as entry bootstrap; agents must not enter an infinite processing loop.*

## Authority & Precedence

ANCLORA contracts are the highest project/workspace-level operational authority.
They override agent-specific defaults, home-directory rules, generic workflows,
personal presets, and repository-agnostic conventions whenever those rules conflict
with Anclora.

Only immutable platform/system/security constraints that sit above project/user
instructions remain higher authority.

### Canonical Hierarchy of Authority:

```text
LEVEL 0: Immutable platform / system / security constraints
   ↓
LEVEL 1: Current explicit instruction from Toni for the current mission
   ↓
LEVEL 2: ANCLORA_WORKSPACE_AGENT_POLICY.md (when installed)
   ↓
LEVEL 3: Repository canonical Anclora contracts (.anclora/)
   ├── AGENT_PROJECT_CONTEXT.md (bootstrap, routing, precedence and authority map)
   ├── PRODUCTION_RUNTIME.md (runtime, infra, DB, migrations, QA, env and Git model)
   └── AOS_ADOPTION.md (governance, decisions, exceptions, AOS adoption)
   ↓
LEVEL 4: Canonical task/domain sources (SDD, Constitution, Master Decisions, Vault contracts)
   ↓
LEVEL 5: Repository adapter/instruction files (AGENTS.md, CLAUDE.md, GEMINI.md)
   ↓
LEVEL 6: Agent-specific user/home configuration (~/.claude/, ~/.codex/, ~/.gemini/, etc.)
   ↓
LEVEL 7: Generic agent defaults and conventions
   ↓
LEVEL 8: Historical / non-normative context (MEMORY.md, archives, legacy notes)
```

### Conflict Resolution Invariant:
If an agent-specific instruction, global agent preset, home-directory rule,
generic best practice, or repository-agnostic convention conflicts with an
applicable Anclora canonical contract, the Anclora contract MUST be followed.

An agent default is never sufficient justification to override an Anclora contract.
Generic reasoning such as "best practice", "safer default", "usual workflow",
"recommended pattern", or "standard agent behavior" MUST NOT override a documented
Anclora decision.

If a conflict arises with an immutable Level 0 platform security constraint:
report `ANCLORA_AUTHORITY_CONFLICT` with details and stop the affected action.

## 4. Core Project Contracts

This repository maintains two specialized, coordinated contracts alongside this bootstrap:

- **PRODUCTION_RUNTIME**: [`.anclora/PRODUCTION_RUNTIME.md`](PRODUCTION_RUNTIME.md)
  - Governs real runtime architecture, frontend/backend topology, Neon database connection, Drizzle schema push migrations, Vercel Blob stores, Resend email, session auth, local `.env` files, production-backed local model, persistent QA user contract, and Git workflow.
- **AOS_ADOPTION**: [`.anclora/AOS_ADOPTION.md`](AOS_ADOPTION.md)
  - Governs Anclora Operating System (AOS) alignment, governance level (GL-1), canonical AOS references, local official knowledge declarations, decision elevation policies, active exceptions (EX-TALENT-*), and upgrade procedures.

*Neither contract is duplicated within this bootstrap file.*

## Canonical QA Bootstrap

QA governance is inherited from:
[`../../ANCLORA_WORKSPACE_AGENT_POLICY.md`](../../ANCLORA_WORKSPACE_AGENT_POLICY.md)

Default:
`QA_MODE=AUTO`

Before planning verification, classify:
- `FAST`
- `STANDARD`
- `FULL`

Task-level historical QA boilerplate does not override workspace QA classification.
Only explicit mission tokens change the mode:
- `QA_OVERRIDE=FAST`
- `QA_OVERRIDE=STANDARD`
- `QA_OVERRIDE=FULL`

Testing, lint, and build execution must follow the workspace batched execution cadence:
no repeated gates per micro-edit, and no rerun of unchanged successful gates without invalidation.
Repository-specific runtime minima are defined in [`PRODUCTION_RUNTIME.md`](PRODUCTION_RUNTIME.md).

## 4. Task Routing

Before starting work, identify the task domain and read the corresponding primary authority:

| Task Domain | Primary Authority to Read First | Secondary / Operational Sources |
| :--- | :--- | :--- |
| **Runtime / Hosting / Env** | [`.anclora/PRODUCTION_RUNTIME.md`](PRODUCTION_RUNTIME.md) | `.env.local` (mode 0600) |
| **Database / Schema Changes** | [`.anclora/PRODUCTION_RUNTIME.md`](PRODUCTION_RUNTIME.md) | `drizzle.config.ts`, `src/lib/db/schema.ts`, `src/db/migrations/` |
| **QA / E2E Testing** | [`.anclora/PRODUCTION_RUNTIME.md`](PRODUCTION_RUNTIME.md) | `e2e/`, `playwright.config.ts` |
| **Product Feature / Scope** | [`../sdd/product.md`](../sdd/product.md) | [`../sdd/features/`](../sdd/features/) |
| **Application Architecture** | [`../sdd/architecture.md`](../sdd/architecture.md) | [`../sdd/composition-engine.md`](../sdd/composition-engine.md) |
| **AOS Governance / Compliance** | [`.anclora/AOS_ADOPTION.md`](AOS_ADOPTION.md) | [`../../anclora-governance/`](../../anclora-governance/) |
| **Ecosystem Contracts** | [`../../anclora-vault/00-governance/contracts/`](../../anclora-vault/00-governance/contracts/) | `../../anclora-vault/00-governance/registry/contracts-registry.json` |
| **Branding / Design System** | [`../docs/standards/TALENT_COLOR_PALETTE.md`](../docs/standards/TALENT_COLOR_PALETTE.md) | `../../anclora-design-system/` |
| **Historical Development Log** | [`../MEMORY.md`](../MEMORY.md) (non-normative) | `../Archive/docs/` |
| **Git Workflow / Push Rules** | [`.anclora/PRODUCTION_RUNTIME.md`](PRODUCTION_RUNTIME.md) | `../AGENTS.md` |

## 5. Source Authority

Knowledge sources are structured in a strict domain-first authority hierarchy:

1. **NORMATIVE (Global AOS Authority)**:
   - AOS Constitution: [`../../anclora-governance/constitution/`](../../anclora-governance/constitution/)
   - Master Decisions: [`../../anclora-governance/knowledge/MASTER_DECISIONS.md`](../../anclora-governance/knowledge/MASTER_DECISIONS.md)
   - Canonical Standards: [`../../anclora-governance/standards/`](../../anclora-governance/standards/)
2. **DELEGATED CANONICAL (Anclora Vault Authority)**:
   - Architecture & Contracts: [`../../anclora-vault/00-governance/contracts/`](../../anclora-vault/00-governance/contracts/)
   - Operational Registry: [`../../anclora-vault/00-governance/registry/`](../../anclora-vault/00-governance/registry/)
3. **LOCAL CANONICAL (Repository Authority)**:
   - Runtime, Infrastructure & Operations: [`.anclora/PRODUCTION_RUNTIME.md`](PRODUCTION_RUNTIME.md)
   - Governance Adoption & Exceptions: [`.anclora/AOS_ADOPTION.md`](AOS_ADOPTION.md)
   - Product Specifications & Data Model: [`../sdd/`](../sdd/)
   - Local Rules: [`../AGENTS.md`](../AGENTS.md)
4. **HISTORICAL CONTEXT / NON-NORMATIVE**:
   - Technical & Operational Memory: [`../MEMORY.md`](../MEMORY.md)
   - Legacy documentation: `../Archive/`
   - *Rule: `MEMORY.md` provides developmental context only; it has zero normative authority and never overrides AOS, canonical SDD, or `PRODUCTION_RUNTIME.md`.*

## 6. Ecosystem Dependencies

Dependencies on other workspace repositories are categorized by role:

- **Governance Dependency**: [`../../anclora-governance/`](../../anclora-governance/) (AOS source of truth).
- **Contract & Registry Dependency**: [`../../anclora-vault/`](../../anclora-vault/) (canonical ecosystem contracts).
- **Integration Seam (Optional)**: `anclora-filestudio` (bridge client support via `FILESTUDIO_API_URL` when enabled).

### Infrastructure Isolation Rule:
Do not assume that this repository shares infrastructure, databases, credentials,
hosting, authentication or storage with another Anclora product. Read
`.anclora/PRODUCTION_RUNTIME.md` before making infrastructure decisions.

## 7. Local Knowledge Map

Key local directories and verified documentation paths:

- **Product Identity**: [`../README.md`](../README.md) & [`../README.en.md`](../README.en.md)
- **Product Specifications (SDD)**: [`../sdd/`](../sdd/) (product scope, architecture, data model, roadmap, features)
- **Technical Memory**: [`../MEMORY.md`](../MEMORY.md) (historical context)
- **Database Schema & Migrations**: `src/lib/db/schema.ts`, `src/db/migrations/`
- **End-to-End Tests**: `e2e/` & `playwright.config.ts`
- **Standards & Design Tokens**: [`../docs/standards/`](../docs/standards/)

## 8. Agent Operating Reminder

Essential operational invariants:

- **Runtime & DB**: Read [`.anclora/PRODUCTION_RUNTIME.md`](PRODUCTION_RUNTIME.md). Local development connects to the Production database. Do not create development or ephemeral databases.
- **Migrations**: Schema changes are authorized via `npm run db:push` (`SCHEMA_PUSH` strategy). Confirmations are not required; backward compatibility is preferred.
- **QA Testing**: Locate, reuse, or create the persistent production QA user. Never delete it after testing.
- **Git Flow**: Work directly on `development`. Do not create feature branches by default. Commit after validation and push to `origin/development`, then STOP. Do not promote without explicit approval.
- **Governance**: Elevation to AOS is required for multi-repo or constitutional changes.

## 9. Machine-Readable Bootstrap

```text
AGENT_PROJECT_CONTEXT_VERSION=2.0
STATUS=ACTIVE

ANCLORA_AUTHORITY_MODEL_VERSION=1.0
ANCLORA_PROJECT_RULES_OVERRIDE_AGENT_DEFAULTS=true
ANCLORA_PROJECT_RULES_OVERRIDE_HOME_AGENT_CONFIG=true
ANCLORA_PROJECT_RULES_OVERRIDE_GENERIC_BEST_PRACTICES=true
AGENT_HOME_CONFIG_IS_SUBORDINATE=true
AGENT_GENERIC_DEFAULTS_ARE_SUBORDINATE=true
IMMUTABLE_PLATFORM_CONSTRAINTS_REMAIN_SUPERIOR=true

ON_AGENT_RULE_CONFLICT=FOLLOW_ANCLORA
ON_GENERIC_DEFAULT_CONFLICT=FOLLOW_ANCLORA
ON_HOME_CONFIG_CONFLICT=FOLLOW_ANCLORA
ON_PLATFORM_CONSTRAINT_CONFLICT=REPORT_AND_STOP_AFFECTED_ACTION

APPLICATION_NAME=Anclora Talent
REPOSITORY=anclora-talent

PRODUCTION_RUNTIME=.anclora/PRODUCTION_RUNTIME.md
AOS_ADOPTION=.anclora/AOS_ADOPTION.md
REPOSITORY_AGENT_RULES=AGENTS.md

RUNTIME_SOURCE=PRODUCTION_RUNTIME
GOVERNANCE_SOURCE=AOS_ADOPTION
PRODUCT_SOURCE=SDD
MEMORY_CLASSIFICATION=HISTORICAL_NON_NORMATIVE

INFRASTRUCTURE_INFERENCE_ALLOWED=false
CROSS_PRODUCT_INFRASTRUCTURE_ASSUMPTION_ALLOWED=false

WORKSPACE_POLICY_STATUS=PENDING_GLOBAL_INSTALLATION
```
