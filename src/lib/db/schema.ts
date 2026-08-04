import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  // Nullable: accounts created via social OAuth have no password.
  passwordHash: text('password_hash'),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable('sessions', {
  id: varchar('id', { length: 64 }).primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const oauthIdentities = pgTable(
  'oauth_identities',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    provider: varchar('provider', { length: 16 }).notNull(),
    providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('oauth_identities_provider_account_unique').on(table.provider, table.providerAccountId)],
);

export const appUsers = pgTable('app_users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkUserId: varchar('clerk_user_id', { length: 191 }).notNull().unique(),
  email: varchar('email', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 191 }).notNull(),
  workspaceId: uuid('workspace_id'),
  slug: varchar('slug', { length: 191 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  status: varchar('status', { length: 24 }).notNull(),
  workflowStep: integer('workflow_step').notNull().default(1),
  // F2: optional brand profile applied to exports (G1: brand ≠ structure).
  brandProfileId: uuid('brand_profile_id'),
  // F2: product template that seeded the project (drives the launch pack).
  templateId: varchar('template_id', { length: 32 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projectDocuments = pgTable('project_documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  subtitle: text('subtitle').notNull(),
  author: varchar('author', { length: 255 }).notNull().default(''),
  language: varchar('language', { length: 12 }).notNull(),
  sourceMetadata: jsonb('source_metadata'),
  // FASE C: declarative composition rules (DocumentRules JSON)
  rules: jsonb('rules'),
  // FASE C: canonical semantic document model (SemanticDocument JSON)
  documentModel: jsonb('document_model'),
  // FASE C: digital product metadata (DocumentMetadata JSON)
  metadata: jsonb('metadata'),
  // F3: per-block content provenance registry (blockId → 'human' | 'ai')
  provenance: jsonb('provenance'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const documentBlocks = pgTable('document_blocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectDocumentId: uuid('project_document_id').notNull(),
  chapterId: uuid('chapter_id').notNull(),
  chapterOrder: integer('chapter_order').notNull(),
  chapterTitle: varchar('chapter_title', { length: 255 }).notNull(),
  blockOrder: integer('block_order').notNull(),
  blockType: varchar('block_type', { length: 32 }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const projectAssets = pgTable('project_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull(),
  workspaceId: uuid('workspace_id'),
  kind: varchar('kind', { length: 32 }).notNull(),
  blobUrl: text('blob_url').notNull(),
  alt: text('alt'),
  usage: varchar('usage', { length: 64 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const coverDesigns = pgTable('cover_designs', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  subtitle: text('subtitle').notNull(),
  palette: varchar('palette', { length: 32 }).notNull(),
  backgroundImageUrl: text('background_image_url'),
  thumbnailUrl: text('thumbnail_url'),
  layout: varchar('layout', { length: 32 }),
  fontFamily: varchar('font_family', { length: 255 }),
  accentColor: varchar('accent_color', { length: 32 }),
  renderedImageUrl: text('rendered_image_url'),
  showSubtitle: integer('show_subtitle').default(1),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const backCoverDesigns = pgTable('back_cover_designs', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull().unique(),
  title: varchar('title', { length: 255 }).notNull(),
  body: text('body').notNull(),
  authorBio: text('author_bio').notNull(),
  accentColor: varchar('accent_color', { length: 32 }),
  backgroundImageUrl: text('background_image_url'),
  renderedImageUrl: text('rendered_image_url'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const coverLayers = pgTable('cover_layers', {
  id: uuid('id').defaultRandom().primaryKey(),
  coverDesignId: uuid('cover_design_id').notNull(),
  layerOrder: integer('layer_order').notNull(),
  kind: varchar('kind', { length: 32 }).notNull(),
  payload: jsonb('payload').notNull(),
});

export const designTemplates = pgTable('design_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  templateKey: varchar('template_key', { length: 64 }).notNull().unique(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description').notNull(),
  previewUrl: text('preview_url'),
  defaults: jsonb('defaults').notNull(),
});

export const exportJobs = pgTable('export_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull(),
  format: varchar('format', { length: 32 }).notNull(),
  status: varchar('status', { length: 32 }).notNull(),
  artifactUrl: text('artifact_url'),
  requestedAt: timestamp('requested_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
});

export const activityLog = pgTable('activity_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 191 }).notNull(),
  projectId: uuid('project_id'),
  eventType: varchar('event_type', { length: 64 }).notNull(),
  payload: jsonb('payload').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export const userPreferences = pgTable('user_preferences', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 191 }).notNull().unique(),
  editorPreferences: jsonb('editor_preferences').notNull().default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// F2 — versioned brand profiles (dual-profiles addendum: brand ≠ structure).
// A BrandProfile is a theme pack (palette with roles, typographic pair, usage
// proportions, governance and voice rules as jsonb); it never captures
// document hierarchy and is applied to exports as templateOverrides (R3).
export const brandProfiles = pgTable(
  'brand_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    version: integer('version').notNull().default(1),
    // draft | active | deprecated
    status: varchar('status', { length: 16 }).notNull().default('draft'),
    // BrandPaletteColor[] JSON
    palette: jsonb('palette').notNull(),
    // BrandTypography JSON
    typography: jsonb('typography').notNull(),
    // BrandUsageProportions JSON
    usageProportions: jsonb('usage_proportions'),
    // string[] JSON
    governanceRules: jsonb('governance_rules'),
    // BrandVoicePair[] JSON
    voicePairs: jsonb('voice_pairs'),
    sourceFileName: varchar('source_file_name', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('brand_profiles_user_name_version_unique').on(table.userId, table.name, table.version)],
);

// F3 — versioned structure profiles (dual-profiles addendum: brand ≠ structure).
// A StructureProfile is a governed scaffolding contract (hierarchy, rhetorical
// macro-pattern, chapter open/close patterns, enumeration style, table usage
// and source metrics as one jsonb schema); it never captures tone or lexicon
// (G3). Status draft ≙ pendiente_confirmacion_usuario: no structural profile
// is applied without explicit human confirmation of the inferred schema (G2),
// and every profile records its source document (G4).
export const structureProfiles = pgTable(
  'structure_profiles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    version: integer('version').notNull().default(1),
    // draft | active | deprecated
    status: varchar('status', { length: 16 }).notNull().default('draft'),
    // InferredStructureSchema JSON
    schema: jsonb('schema').notNull(),
    sourceFileName: varchar('source_file_name', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('structure_profiles_user_name_version_unique').on(table.userId, table.name, table.version)],
);

// F1b — FileStudio Local Agent pairing (sdd/integrations/filestudio/authentication.md).
// One row per user; credentials are AES-256-GCM encrypted at rest (never logged).
export const filestudioConnections = pgTable('filestudio_connections', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 191 }).notNull().unique(),
  // FileStudio device id (dev_...) once the pairing is approved.
  deviceId: varchar('device_id', { length: 64 }),
  deviceName: varchar('device_name', { length: 255 }),
  // Ed25519 public key of the paired device. Nullable: the current FileStudio
  // approve response does not return it (documented contract gap).
  publicKey: text('public_key'),
  // AES-256-GCM payload (v1:<iv>:<tag>:<ciphertext>, base64) with the
  // access/refresh tokens issued on pairing approval.
  encryptedCredentials: text('encrypted_credentials'),
  // pending | paired | revoked
  status: varchar('status', { length: 24 }).notNull().default('pending'),
  // local | service | browser (sdd/integrations/filestudio/routing-policy.md)
  preferredMode: varchar('preferred_mode', { length: 16 }).notNull().default('local'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// F1b — per-job ask-always consent registry (sdd/integrations/filestudio/routing-policy.md).
export const filestudioConsents = pgTable('filestudio_consents', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 191 }).notNull(),
  operation: varchar('operation', { length: 64 }).notNull(),
  mode: varchar('mode', { length: 16 }).notNull(),
  // granted | denied
  decision: varchar('decision', { length: 16 }).notNull(),
  jobId: varchar('job_id', { length: 64 }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// F1b — jobs emitted to FileStudio, in the Talent-visible state machine
// (queued | processing | completed | failed | cancelled | expired).
export const filestudioJobs = pgTable('filestudio_jobs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: varchar('user_id', { length: 191 }).notNull(),
  projectId: uuid('project_id'),
  // FileStudio-side job id (service or agent route).
  externalJobId: varchar('external_job_id', { length: 64 }).notNull().unique(),
  operation: varchar('operation', { length: 64 }).notNull(),
  // local | service | browser
  mode: varchar('mode', { length: 16 }).notNull(),
  status: varchar('status', { length: 24 }).notNull().default('queued'),
  // Mapped FileStudio error code when status = failed (never shown raw in UI).
  errorCode: varchar('error_code', { length: 64 }),
  // Operation options sent to FileStudio (e.g. { width, fit, quality } for
  // image:resize) — provenance for the F2 processing manifest.
  options: jsonb('options'),
  resultAssetUrl: text('result_asset_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// F1b — webhook idempotency registry (sdd/integrations/filestudio/webhook-flow.md).
export const filestudioWebhookEvents = pgTable('filestudio_webhook_events', {
  id: uuid('id').defaultRandom().primaryKey(),
  // Dedupe key: derived from `type:externalJobId:signature-timestamp` because
  // the current FileStudio payload carries no event id (documented gap).
  dedupeKey: varchar('dedupe_key', { length: 255 }).notNull().unique(),
  eventType: varchar('event_type', { length: 32 }).notNull(),
  externalJobId: varchar('external_job_id', { length: 64 }),
  payload: jsonb('payload').notNull(),
  processedAt: timestamp('processed_at', { withTimezone: true }).defaultNow().notNull(),
});

// F2 — versioned document snapshots (document history). Every captured
// version stores the full SemanticDocument AST; `version` is monotonic per
// project and rows are append-only (restores create a new version, history
// is never rewritten). `sourceHash` is the same SHA-256 of the AST the asset
// manifest uses (src/lib/manifest/hash.ts), so a snapshot can be referenced
// from a future manifest version.
export const documentSnapshots = pgTable(
  'document_snapshots',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').notNull(),
    version: integer('version').notNull(),
    // SemanticDocument JSON (full AST snapshot)
    document: jsonb('document').notNull(),
    label: varchar('label', { length: 255 }).notNull(),
    // manual-save | reimport | restore
    source: varchar('source', { length: 24 }).notNull(),
    sourceHash: varchar('source_hash', { length: 64 }).notNull(),
    createdBy: varchar('created_by', { length: 191 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('document_snapshots_project_version_unique').on(table.projectId, table.version)],
);

// F2 — versioned asset manifests (launch pack). Every coordinated export
// appends a new version; `items` is ProjectAssetManifestItem[] JSON
// (src/lib/manifest/model.ts). Stale detection is computed at read time by
// comparing each item's sourceHash with the current document AST hash.
export const projectAssetManifests = pgTable(
  'project_asset_manifests',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').notNull(),
    version: integer('version').notNull(),
    items: jsonb('items').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('project_asset_manifests_project_version_unique').on(table.projectId, table.version)],
);

// F4 — project collaboration (roles: author = owner, editor = corrector,
// designer = maquetador). One row per (project, user); the owner never has a
// row — ownership of `projects.userId` implies the `author` role. Inviting a
// collaborator carries no seat/plan requirement for the invitee (no billing
// exists yet): accepting the invitation is enough.
export const projectCollaborators = pgTable(
  'project_collaborators',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    projectId: uuid('project_id').notNull(),
    userId: uuid('user_id').notNull(),
    // editor | designer (author is the project owner, never a row here)
    role: varchar('role', { length: 16 }).notNull(),
    invitedBy: uuid('invited_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('project_collaborators_project_user_unique').on(table.projectId, table.userId)],
);

// F4 — email invitations with a signed random token (SHA-256 stored, never
// the raw token) and expiration. If the invited email has no account yet, the
// same link works after registering with that email.
export const projectInvitations = pgTable('project_invitations', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  // editor | designer
  role: varchar('role', { length: 16 }).notNull(),
  tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
  invitedBy: uuid('invited_by').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  acceptedAt: timestamp('accepted_at', { withTimezone: true }),
  acceptedBy: uuid('accepted_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// F4 — comments anchored to the stable block ids of the document AST
// (never text offsets). `parent_id` points at the thread root (flat replies);
// resolving a thread marks the root, replies inherit its status in the view.
export const blockComments = pgTable('block_comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull(),
  blockId: varchar('block_id', { length: 191 }).notNull(),
  authorId: uuid('author_id').notNull(),
  body: text('body').notNull(),
  // open | resolved
  status: varchar('status', { length: 16 }).notNull().default('open'),
  parentId: uuid('parent_id'),
  resolvedBy: uuid('resolved_by'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// F4 — human editor (corrector) corrections as accept/rejectable AST
// patches: same BlockOperation[] + DocumentDiff shape as F3 AI proposals
// (src/lib/ai/ast-diff-proposal.ts), provenance human. Only the author
// decides; applying re-saves the document through the regular save route.
export const editorSuggestions = pgTable('editor_suggestions', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').notNull(),
  authorId: uuid('author_id').notNull(),
  summary: varchar('summary', { length: 500 }).notNull(),
  // BlockOperation[] JSON (src/lib/ai/ast-diff-proposal.ts)
  operations: jsonb('operations').notNull(),
  // DocumentDiff JSON (src/lib/document/diff.ts)
  diff: jsonb('diff').notNull(),
  // pending | accepted | rejected
  status: varchar('status', { length: 16 }).notNull().default('pending'),
  decidedBy: uuid('decided_by'),
  decidedAt: timestamp('decided_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

// F4 — sales channel credentials (Gumroad access token, one row per
// user+channel). Tokens are AES-256-GCM encrypted at rest
// (src/lib/sales/credentials.ts, same scheme as filestudio/crypto.ts) and
// never logged. Hotmart has no credentials: its channel is a manual export.
export const salesChannelCredentials = pgTable(
  'sales_channel_credentials',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: varchar('user_id', { length: 191 }).notNull(),
    // gumroad (hotmart needs no token — export-only channel)
    channel: varchar('channel', { length: 32 }).notNull(),
    // AES-256-GCM payload (v1:<iv>:<tag>:<ciphertext>, base64)
    encryptedToken: text('encrypted_token').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [unique('sales_channel_credentials_user_channel_unique').on(table.userId, table.channel)],
);
