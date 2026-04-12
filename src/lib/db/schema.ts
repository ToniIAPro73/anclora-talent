import {
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

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
