CREATE TABLE "document_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"document" jsonb NOT NULL,
	"label" varchar(255) NOT NULL,
	"source" varchar(24) NOT NULL,
	"source_hash" varchar(64) NOT NULL,
	"created_by" varchar(191) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "document_snapshots_project_version_unique" UNIQUE("project_id","version")
);
