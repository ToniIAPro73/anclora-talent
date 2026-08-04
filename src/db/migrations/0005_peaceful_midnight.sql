CREATE TABLE "filestudio_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"device_id" varchar(64),
	"device_name" varchar(255),
	"public_key" text,
	"encrypted_credentials" text,
	"status" varchar(24) DEFAULT 'pending' NOT NULL,
	"preferred_mode" varchar(16) DEFAULT 'local' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "filestudio_connections_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "filestudio_consents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"operation" varchar(64) NOT NULL,
	"mode" varchar(16) NOT NULL,
	"decision" varchar(16) NOT NULL,
	"job_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
