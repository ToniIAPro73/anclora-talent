CREATE TABLE "import_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"source_blob_url" text,
	"source_access_level" varchar(32),
	"source_sha256" varchar(64),
	"source_size_bytes" integer,
	"source_file_name" varchar(255) NOT NULL,
	"source_mime_type" varchar(128) NOT NULL,
	"document_mode" varchar(32) DEFAULT 'editable' NOT NULL,
	"extracted_seed" jsonb NOT NULL,
	"composition" jsonb,
	"status" varchar(24) DEFAULT 'ready' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "import_sessions_user_id_idx" ON "import_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "import_sessions_status_idx" ON "import_sessions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "import_sessions_expires_at_idx" ON "import_sessions" USING btree ("expires_at");