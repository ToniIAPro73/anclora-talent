# P3 — Authentication Recovery, Validation and Entry Parity

Repo status: BLOCKED

Findings: UX-02, UX-03, UX-10.

Execution status: `P3-M00 PASS`; `P3-M02 PASS`; `P3-M01 BLOCKED`; `P3-FINAL-GATE BLOCKED`.

Evidence: `npx vitest run src/components/auth/RegisterPageContent.test.tsx src/app/api/auth/register/route.test.ts src/lib/auth/oauth/pkce.test.ts` passed 15/15. P2 CI run [34521552541](https://github.com/ToniIAPro73/anclora-talent/actions/runs/34521552541) passed for `18b72d9`. P3 cannot close because repository has no password-recovery route, recovery-token schema/storage or transactional email boundary.

Blocking condition: do not create apparent recovery success or issue recoverable tokens without approved one-use/expiry/hash/invalidation contract and configured transactional delivery boundary. P4 and later phases do not start while P3 is BLOCKED.

### EXECUTION MODE

- `CAVEMAN`: P3-M00-T03, P3-M02-T03.
- Normal prose: all recovery/security tasks and P3-FINAL-GATE.

## P3-M00 — Registration validation

- **ID:** P3-M00
- **TITLE:** Map registration errors to correction guidance
- **OBJECTIVE:** turn coarse server failures into localized field-level recovery.
- **SOURCE_DRIVERS:** UX-03; register route/component and existing password requirements.
- **CURRENT_STATE:** only email-in-use is distinct; invalid password/full name can show generic failure while values remain.
- **TARGET_STATE:** server error taxonomy maps to field errors, first invalid field receives focus, values/pending protection remain.
- **SCOPE:** register route, RegisterPageContent, messages and tests.
- **OUT_OF_SCOPE:** changing password policy or user creation semantics.
- **DEPENDENCIES:** P2 semantic/accessibility foundations.
- **PREREQUISITES:** current API error contract and locale dictionary.
- **RISKS:** exposing account existence or weakening validation.
- **DO_NOT_BREAK:** password requirements, preserved values, pending submit protection, bcrypt.
- **AFFECTED_ROUTES:** `/sign-up`, `/api/auth/register`.
- **AFFECTED_COMPONENTS:** RegisterPageContent.
- **AFFECTED_API:** additive/stable error codes only.
- **AFFECTED_DATA:** no user creation on invalid input.
- **AFFECTED_TESTS:** route/component/negative E2E.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** revert copy/mapping while preserving server rejection.
- **OBSERVABILITY:** error class/code without email/password values.
- **DOCUMENTATION_UPDATES:** auth error matrix.

### TASKS
#### P3-M00-T01 — Error taxonomy
- P3-M00-T01.01 Enumerate invalid email/password/full-name and email-in-use codes.
- P3-M00-T01.02 Preserve generic account-safe behavior where required.
- P3-M00-T01.03 Add route tests proving invalid input does not write.
#### P3-M00-T02 — Field recovery UI
- P3-M00-T02.01 Map codes to ES/EN field messages.
- P3-M00-T02.02 Preserve valid inputs and pending-state recovery.
- P3-M00-T02.03 Focus the first invalid field and expose `aria-describedby`.
#### P3-M00-T03 — Browser validation
- P3-M00-T03.01 Exercise invalid password and invalid email safely.
- P3-M00-T03.02 Check light/dark and ES/EN at 390/1440.
- P3-M00-T03.03 Assert no account enumeration or accidental creation.

### ACCEPTANCE CRITERIA

GIVEN a one-character password or invalid email, WHEN registration is submitted, THEN the invalid field and correction are stated in the active locale, AND valid values remain and no user is created.

## P3-M01 — Password recovery

- **ID:** P3-M01
- **TITLE:** Replace the non-interactive recovery promise with a secure contract
- **OBJECTIVE:** implement or explicitly scope a complete, non-enumerating recovery journey.
- **SOURCE_DRIVERS:** UX-02; SPEC §12; current LoginPageContent behavior.
- **CURRENT_STATE:** forgot-password copy is unavailable and no recovery route exists.
- **TARGET_STATE:** request/reset flow has one-use expiring token handling, safe response, invalidation, rate limit and transactional email boundary.
- **SCOPE:** recovery design and implementation requirements; future code phase must be separately authorized.
- **OUT_OF_SCOPE:** sending real email in this roadmap authoring; provider migration.
- **DEPENDENCIES:** P3-M00; security review and email boundary availability.
- **PREREQUISITES:** approved token storage/rate-limit/email design.
- **RISKS:** account enumeration, replay, token leakage, broken session invalidation.
- **DO_NOT_BREAK:** bcrypt, sessions, masking, current login feedback and OAuth.
- **AFFECTED_ROUTES:** `/sign-in`, recovery request/reset routes.
- **AFFECTED_COMPONENTS:** LoginPageContent and recovery UI.
- **AFFECTED_API:** new recovery endpoints only with explicit contract.
- **AFFECTED_DATA:** token hash/expiry/use state if schema requires it.
- **AFFECTED_TESTS:** security negative, route, email boundary and E2E fixture.
- **MIGRATION_IMPACT:** possible additive token table/fields; migration Gate mandatory if needed.
- **ROLLBACK_STRATEGY:** disable recovery route behind safe state; invalidate issued test tokens; restore truthful unavailable copy.
- **OBSERVABILITY:** request ID, outcome class and rate-limit state; never token/email disclosure.
- **DOCUMENTATION_UPDATES:** auth/security/recovery contract and threat notes.

### TASKS
#### P3-M01-T01 — Token/security contract
- P3-M01-T01.01 Define single-use expiring token and hashed storage.
- P3-M01-T01.02 Define enumeration-safe response and rate-limit behavior.
- P3-M01-T01.03 Define invalidation, session handling and transactional email boundary.
#### P3-M01-T02 — Safe implementation boundary
- P3-M01-T02.01 Add request/reset routes only after contract approval.
- P3-M01-T02.02 Add localized pending/error/success states without account disclosure.
- P3-M01-T02.03 Add authorized synthetic email/token fixture path.
#### P3-M01-T03 — Negative verification
- P3-M01-T03.01 Test unknown email response equivalence.
- P3-M01-T03.02 Test expired, reused, malformed and invalidated tokens.
- P3-M01-T03.03 Test rate limit, password hash update and session policy.

### ACCEPTANCE CRITERIA

GIVEN a user requests recovery for an existing or unknown address, WHEN the request is submitted, THEN the external response does not reveal account existence, AND any reset token is single-use, expiring, non-recoverably stored and invalidated after use.

## P3-M02 — Social auth parity and security regression

- **ID:** P3-M02
- **TITLE:** Make supported OAuth entry points consistent
- **OBJECTIVE:** expose the same enabled providers on sign-up and sign-in under the existing provider/linking policy.
- **SOURCE_DRIVERS:** UX-10; OAuth availability/config/PKCE modules.
- **CURRENT_STATE:** Google/GitHub visible on sign-in but absent from sign-up; OAuth completion was not performed in audit.
- **TARGET_STATE:** provider availability is consistent, semantics distinguish creation/login, and PKCE/state/linking rules remain unchanged.
- **SCOPE:** registration entry surface, provider availability and tests.
- **OUT_OF_SCOPE:** external consent completion and provider policy changes.
- **DEPENDENCIES:** P3-M00, existing OAuth modules.
- **PREREQUISITES:** provider availability fixtures.
- **RISKS:** duplicate account/linking confusion or provider gating regression.
- **DO_NOT_BREAK:** PKCE/state, rate limits, provider gating and identity linking.
- **AFFECTED_ROUTES:** `/sign-up`, `/sign-in`, OAuth start.
- **AFFECTED_COMPONENTS:** auth entry components.
- **AFFECTED_API:** existing OAuth start/callback only.
- **AFFECTED_DATA:** identities/session behavior unchanged.
- **AFFECTED_TESTS:** provider availability/start/negative tests.
- **MIGRATION_IMPACT:** none.
- **ROLLBACK_STRATEGY:** remove signup provider entries without changing OAuth backend.
- **OBSERVABILITY:** provider and outcome class, no auth codes/tokens.
- **DOCUMENTATION_UPDATES:** auth parity matrix.

### TASKS
#### P3-M02-T01 — Entry parity
- P3-M02-T01.01 Reuse the current provider availability contract.
- P3-M02-T01.02 Add Google/GitHub entries to sign-up when enabled.
- P3-M02-T01.03 Localize creation/linking guidance.
#### P3-M02-T02 — Security tests
- P3-M02-T02.01 Assert provider disabled state is not advertised as active.
- P3-M02-T02.02 Assert PKCE/state/rate-limit tests remain green.
- P3-M02-T02.03 Assert no duplicate identity ownership regression.
#### P3-M02-T03 — Journey validation
- P3-M02-T03.01 Validate sign-in/sign-up ES/EN and light/dark.
- P3-M02-T03.02 Validate keyboard names and tab order.
- P3-M02-T03.03 Record external OAuth completion as NOT_APPLICABLE when no safe account exists.

### ACCEPTANCE CRITERIA

GIVEN a provider is enabled by the existing availability contract, WHEN an anonymous user opens sign-in or sign-up, THEN the same provider is discoverable with truthful creation/login semantics, AND PKCE/state/linking behavior is unchanged.

## P3-FINAL-GATE

- P3-M00..M02 PASS.
- G4 and G12 pass for validation, recovery and OAuth negative cases.
- No real email, external provider account or production mutation is used.
- If recovery schema migration is needed, migration compatibility and rollback evidence are PASS.
- Existing credential login, password masking, OAuth tests and session boundaries pass.

### Additional final tasks

#### P3-FINAL-T01 — Security review closure
- P3-FINAL-T01.01 Review token, session and enumeration evidence.
- P3-FINAL-T01.02 Review logs for sensitive-data absence.
- P3-FINAL-T01.03 Record security Gate result.

#### P3-FINAL-T02 — Phase closure
- P3-FINAL-T02.01 Run lint, tests, build and affected E2E.
- P3-FINAL-T02.02 Update status/evidence and inspect diff.
- P3-FINAL-T02.03 Permit commit/push/promotion only on PASS.
