CREATE TABLE "filestudio_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"project_id" uuid,
	"external_job_id" varchar(64) NOT NULL,
	"operation" varchar(64) NOT NULL,
	"mode" varchar(16) NOT NULL,
	"status" varchar(24) DEFAULT 'queued' NOT NULL,
	"error_code" varchar(64),
	"result_asset_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "filestudio_jobs_external_job_id_unique" UNIQUE("external_job_id")
);
--> statement-breakpoint
CREATE TABLE "filestudio_webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"dedupe_key" varchar(255) NOT NULL,
	"event_type" varchar(32) NOT NULL,
	"external_job_id" varchar(64),
	"payload" jsonb NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "filestudio_webhook_events_dedupe_key_unique" UNIQUE("dedupe_key")
);
