CREATE TABLE IF NOT EXISTS "activity_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"project_id" uuid,
	"event_type" varchar(64) NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "app_users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"clerk_user_id" varchar(191) NOT NULL,
	"email" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "app_users_clerk_user_id_unique" UNIQUE("clerk_user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "back_cover_designs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"author_bio" text NOT NULL,
	"accent_color" varchar(32),
	"background_image_url" text,
	"rendered_image_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "back_cover_designs_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cover_designs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"subtitle" text NOT NULL,
	"palette" varchar(32) NOT NULL,
	"background_image_url" text,
	"thumbnail_url" text,
	"layout" varchar(32),
	"font_family" varchar(255),
	"accent_color" varchar(32),
	"rendered_image_url" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "cover_designs_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "cover_layers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"cover_design_id" uuid NOT NULL,
	"layer_order" integer NOT NULL,
	"kind" varchar(32) NOT NULL,
	"payload" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "design_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template_key" varchar(64) NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text NOT NULL,
	"preview_url" text,
	"defaults" jsonb NOT NULL,
	CONSTRAINT "design_templates_template_key_unique" UNIQUE("template_key")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "document_blocks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_document_id" uuid NOT NULL,
	"chapter_id" uuid NOT NULL,
	"chapter_order" integer NOT NULL,
	"chapter_title" varchar(255) NOT NULL,
	"block_order" integer NOT NULL,
	"block_type" varchar(32) NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "export_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"format" varchar(32) NOT NULL,
	"status" varchar(32) NOT NULL,
	"artifact_url" text,
	"requested_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"workspace_id" uuid,
	"kind" varchar(32) NOT NULL,
	"blob_url" text NOT NULL,
	"alt" text,
	"usage" varchar(64) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "project_documents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"title" varchar(255) NOT NULL,
	"subtitle" text NOT NULL,
	"language" varchar(12) NOT NULL,
	"source_metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "project_documents_project_id_unique" UNIQUE("project_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"workspace_id" uuid,
	"slug" varchar(191) NOT NULL,
	"title" varchar(255) NOT NULL,
	"status" varchar(24) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
-- Add columns to existing tables that may have been created before the schema was updated.
-- These are safe to run even if the columns already exist (IF NOT EXISTS).
ALTER TABLE "cover_designs"
	ADD COLUMN IF NOT EXISTS "layout" varchar(32),
	ADD COLUMN IF NOT EXISTS "font_family" varchar(255),
	ADD COLUMN IF NOT EXISTS "accent_color" varchar(32),
	ADD COLUMN IF NOT EXISTS "rendered_image_url" text,
	ADD COLUMN IF NOT EXISTS "show_subtitle" integer DEFAULT 1;
--> statement-breakpoint
ALTER TABLE "project_documents"
	ADD COLUMN IF NOT EXISTS "source_metadata" jsonb;
