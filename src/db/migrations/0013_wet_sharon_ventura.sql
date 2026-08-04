CREATE TABLE "structure_profiles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar(191) NOT NULL,
	"name" varchar(255) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"status" varchar(16) DEFAULT 'draft' NOT NULL,
	"schema" jsonb NOT NULL,
	"source_file_name" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "structure_profiles_user_name_version_unique" UNIQUE("user_id","name","version")
);
