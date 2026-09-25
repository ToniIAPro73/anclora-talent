# Anclora Talent — Production Runtime Manifest

PRODUCTION_RUNTIME_MANIFEST_VERSION=2.0
RUNTIME_CONTRACT_AUTHORITY=CANONICAL
STATUS=PRODUCTION_RUNTIME_CONFIRMED
LOCAL_RUNTIME_MODEL=PRODUCTION_BACKED
DO_NOT_CREATE_DEVELOPMENT_DATABASE=true

Runtime, environment, database, migration, QA and Git rules declared in this
manifest override generic agent defaults or home-directory agent policies.

## 1. Application Identity

APPLICATION_NAME=Anclora Talent
REPOSITORY=anclora-talent
APPLICATION_TYPE=fullstack
FRAMEWORK=Next.js 15 (App Router) + React 19 + Turbopack + Tailwind CSS

## 2. Runtime Topology

FRONTEND_PROVIDER=Vercel
BACKEND_PROVIDER=Vercel Serverless Functions
PRODUCTION_DOMAIN=talent.anclora.com
PRODUCTION_DEPLOYMENT_PROVIDER=Vercel

```text
Browser
   ↓
Vercel Frontend (Next.js App Router)
   ↓
Vercel Serverless Functions (Route Handlers / Server Actions)
   ├── Neon Production Database (neondb)
   ├── Vercel Blob: anclora-talent-container (Public Assets)
   ├── Vercel Blob: anclora-talent-source-documents (Private Source Documents)
   └── Resend API (Transactional Email)
```

## 3. Production Database Contract

DATABASE_PROVIDER=Neon Serverless PostgreSQL
DATABASE_PROJECT=anclora-talent
DATABASE_BRANCH=main
DATABASE_NAME=neondb
DATABASE_REGION=eu-central-1 (AWS c-3.eu-central-1.aws.neon.tech)
DATABASE_ENDPOINT=ep-old-lake-aldzrl3x-pooler.c-3.eu-central-1.aws.neon.tech
DATABASE_ENDPOINT_UNPOOLED=ep-old-lake-aldzrl3x.c-3.eu-central-1.aws.neon.tech
DATABASE_RUNTIME_SCOPE=production
LOCAL_DATABASE_SCOPE=production

Local development intentionally connects to the Production database.

This is the Anclora operating model.

Do not create or switch to a Development, Preview, Staging, ephemeral,
local or alternate database unless Toni explicitly requests it.

## 4. Database Migration Contract

DATABASE_SCOPE=production
LOCAL_DATABASE_SCOPE=production

MIGRATION_SYSTEM=Drizzle ORM / drizzle-kit
MIGRATION_STRATEGY=SCHEMA_PUSH
MIGRATION_DIRECTORY=./src/db/migrations
MIGRATION_RUNNER=npm run db:push (dotenv -e .env.local -- drizzle-kit push)

DEVELOPMENT_SCHEMA_COMMAND=npm run db:push (dotenv -e .env.local -- drizzle-kit push)
PRODUCTION_SCHEMA_COMMAND=npm run db:push (dotenv -e .env.local -- drizzle-kit push)
MIGRATION_GENERATION_COMMAND=npm run db:generate (drizzle-kit generate)
MIGRATION_HISTORY_AUTHORITY=src/lib/db/schema.ts + src/db/migrations/meta/_journal.json
RUNNER_DIRECT_MIGRATION_EXECUTION=BLOCKED (scripts/migrate.ts guarded with ALLOW_MIGRATE=true to prevent collision with db:push)

SCHEMA_CHANGES_ALLOWED=true
PRODUCTION_MIGRATIONS_ALLOWED=true
MIGRATION_CONFIRMATION_REQUIRED=false

DATA_MIGRATIONS_ALLOWED=true
BACKFILLS_ALLOWED=true
INDEX_CHANGES_ALLOWED=true
CONSTRAINT_CHANGES_ALLOWED=true
RLS_POLICY_CHANGES_ALLOWED=true

BACKWARD_COMPATIBILITY_PREFERRED=true

DESTRUCTIVE_CHANGES_ALLOWED_WHEN_REQUIRED_BY_IMPLEMENTATION=true

RANDOM_DATABASE_RESET_ALLOWED=false
UNRELATED_PRODUCTION_DATA_DELETION_ALLOWED=false

When an implementation requires schema modifications (such as CREATE TABLE,
ALTER TABLE, ADD/DROP COLUMN, INDEX, FOREIGN KEY, CONSTRAINT, ENUM, VIEW,
FUNCTION, TRIGGER, POLICY, RLS, BACKFILL, or DATA TRANSFORMATION), the agent
is authorized to create the migration, validate it, check Production, apply
it to Production, and continue with QA/E2E without requesting additional
confirmation.

Production database migrations should remain backward-compatible with the
currently deployed application whenever technically reasonable, because the
database migration may be applied before the validated development commit is
promoted to the Production application branch. Prefer expand -> migrate -> contract
patterns when appropriate.

## 5. Storage Contract

### Public Blob
STORE_NAME=anclora-talent-container
STORE_ID=store_uHA5hTGHfhPkujHH
STORE_REGION=cdg1
ACCESS=public
PURPOSE=covers, back covers, chapter images, project assets
ENV_CONTRACT=BLOB_READ_WRITE_TOKEN

### Private Blob
STORE_NAME=anclora-talent-source-documents
STORE_ID=store_gN3uHfHAhFNEiJ7R
STORE_REGION=iad1
ACCESS=private
PURPOSE=original source documents / fixed-PDF (fail-closed document storage)
ENV_CONTRACT=SOURCE_DOCUMENT_READ_WRITE_TOKEN

DO_NOT_MERGE_PUBLIC_AND_PRIVATE_STORES=true

## 6. Authentication Contract

AUTH_MODEL=Cookie session-based authentication (anclora_talent_session HttpOnly)
SESSION_STORAGE=PostgreSQL sessions table (Neon Production)
USER_STORAGE=PostgreSQL users table (Neon Production)
OAUTH_PROVIDERS=Google OAuth, GitHub OAuth (/api/auth/oauth/*)
PASSWORD_MODEL=bcrypt (12 rounds) via bcryptjs

## 7. Email Contract

EMAIL_PROVIDER=Resend
EMAIL_ENV_CONTRACT=RESEND_API_KEY
EMAIL_FROM_CONTRACT=Anclora Talent <antonio@anclora.com>
EMAIL_USAGE=Transactional email delivery (account verification, password recovery, notifications)

## 8. External Integrations

ACTIVE:
- Resend API (Transactional emails via RESEND_API_KEY)
- Google OAuth (Authentication seam via GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_CALLBACK_URL)
- GitHub OAuth (Authentication seam via GITHUB_OAUTH_CLIENT_ID, GITHUB_OAUTH_CLIENT_SECRET, GITHUB_OAUTH_CALLBACK_URL)

OPTIONAL:
- OpenAI Cloud Assistance (Feature-flagged; disabled if OPENAI_API_KEY is not provisioned)
- FileStudio Bridge (Feature-flagged; disabled if FILESTUDIO_API_URL is not configured)

DISABLED:
- None

## 9. Local Environment Contract

Environment files:
- `.env.local` (located in repository root, mode 0600, strictly gitignored)

LOCAL_RUNTIME_MODEL=PRODUCTION_BACKED

Production resource variables must resolve to Production resources even when
the application itself is running locally.

### Separation of Variables:
- PRODUCTION_RESOURCE_VARIABLES:
  - `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `PGHOST`, `POSTGRES_URL` → Production Neon PostgreSQL
  - `BLOB_READ_WRITE_TOKEN` → Production Vercel Blob Store (Public)
  - `SOURCE_DOCUMENT_READ_WRITE_TOKEN` → Production Vercel Blob Store (Private)
  - `RESEND_API_KEY` → Production Resend API
  - `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, `GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET` → Production OAuth apps
- LOCAL_ONLY_RUNTIME_VARIABLES:
  - `PORT=3000` → Local HTTP server binding port

## 10. Local Runtime Exceptions

VARIABLE=NEXT_PUBLIC_APP_URL
CANONICAL_VALUE=https://talent.anclora.com
TEMPORARY_LOCAL_VALUE=http://localhost:3000
WHEN_ALLOWED=Only during local development and testing to ensure client browser routing, navigation, and local API calls resolve to localhost without redirecting to production.
RESTORE_REQUIRED=false

VARIABLE=AUTH_APP_URL
CANONICAL_VALUE=https://talent.anclora.com
TEMPORARY_LOCAL_VALUE=http://localhost:3000
WHEN_ALLOWED=Only when a local authentication callback or password reset flow technically requires redirection to localhost.
RESTORE_REQUIRED=true

## QA Contract

QA_POLICY=WORKSPACE_PROPORTIONAL
QA_MODE_DEFAULT=AUTO
TEST_EXECUTION_POLICY=BATCHED
FULL_GATES_AFTER_EVERY_EDIT=false
REPEAT_UNCHANGED_SUCCESSFUL_GATES=false
VISUAL_QA_EXECUTION=BY_QA_MODE
QA_MINIMUM_FOR_DATABASE_MIGRATION=FULL
QA_MINIMUM_FOR_AUTH=FULL
QA_MINIMUM_FOR_RELEASE_PROMOTION=FULL


QA_AUTH_MODEL=DEDICATED_USER
QA_IS_DEDICATED=true
QA_IS_REAL_USER=false
REAL_USER_AS_QA_ALLOWED=false
QA_SCOPE=production
QA_REUSE=true
QA_CREATE_IF_MISSING=true
QA_DELETE_AFTER_TEST=false
QA_CREATION_CONFIRMATION_REQUIRED=false
QA_PERSISTENT_IDENTITY=e2e.auth@anclora-talent.test

For dedicated human QA: Use designated production test identity. Never use Toni's personal account or operational admins as QA accounts. Never delete test account after testing.

## 12. Git Workflow Contract

WORK_BRANCH=development
CREATE_FEATURE_BRANCH=false
AUTO_COMMIT_AFTER_VALIDATION=true
AUTO_PUSH_DEVELOPMENT=true
AUTO_PROMOTE=false
STOP_AFTER_DEVELOPMENT_PUSH=true

```text
development local
   ↓
implementation
   ↓
migration if needed
   ↓
verification according to canonical QA mode
   ↓
commit
   ↓
push origin/development
   ↓
STOP
```

Agents must NOT create feature/fix/task/agent branches unless Toni explicitly
requests one for the current mission.

Promotion to staging / production / main requires explicit Toni approval.
When promotion is requested, preserve the validated development commit SHA
whenever branch topology allows fast-forward promotion.

## 13. Agent Startup Contract

Before executing tasks, the agent must read and apply in order:
1. Current explicit instructions from Toni
2. Workspace agent policy (`../../ANCLORA_WORKSPACE_AGENT_POLICY.md` when installed, `../../AGENTS.md` interim)
3. Repository agent rules (`../AGENTS.md`)
4. `.anclora/AGENT_PROJECT_CONTEXT.md` (bootstrap, task routing, and authority map)
5. `.anclora/PRODUCTION_RUNTIME.md` (this manifest as operative runtime contract)
6. `.anclora/AOS_ADOPTION.md` (governance, decisions, exceptions)
7. Repository-specific instructions (`CLAUDE.md`, `GEMINI.md`, etc., when present)

## 14. Forbidden Defaults

- Do not create Development DB by default.
- Do not create Preview DB by default.
- Do not create temporary feature branches.
- Do not replace Production env with Development env.
- Do not delete persistent QA user after testing.
- Do not automatically promote after development push.
- Do not reset Production DB merely to simplify testing.
- Do not delete unrelated Production data.
- Do not expose secrets.

## 15. Machine-Readable Contract

```text
PRODUCTION_RUNTIME_MANIFEST_VERSION=2.0
RUNTIME_CONTRACT_AUTHORITY=CANONICAL

STATUS=PRODUCTION_RUNTIME_CONFIRMED
LOCAL_RUNTIME_MODEL=PRODUCTION_BACKED

DATABASE_SCOPE=production
LOCAL_DATABASE_SCOPE=production
DO_NOT_CREATE_DEVELOPMENT_DATABASE=true

Runtime, environment, database, migration, QA and Git rules declared in this
manifest override generic agent defaults or home-directory agent policies.

MIGRATION_SYSTEM=Drizzle ORM / drizzle-kit
MIGRATION_STRATEGY=SCHEMA_PUSH
PRODUCTION_MIGRATIONS_ALLOWED=true
MIGRATION_CONFIRMATION_REQUIRED=false
BACKWARD_COMPATIBILITY_PREFERRED=true

QA_MODEL=PERSISTENT_PRODUCTION_USER
QA_REUSE=true
QA_CREATE_IF_MISSING=true
QA_DELETE_AFTER_TEST=false

WORK_BRANCH=development
CREATE_FEATURE_BRANCH=false
AUTO_COMMIT_AFTER_VALIDATION=true
AUTO_PUSH_DEVELOPMENT=true
AUTO_PROMOTE=false
STOP_AFTER_DEVELOPMENT_PUSH=true
```
