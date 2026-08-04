ALTER TABLE "project_documents" ADD COLUMN "rules" jsonb;--> statement-breakpoint
ALTER TABLE "project_documents" ADD COLUMN "document_model" jsonb;--> statement-breakpoint
ALTER TABLE "project_documents" ADD COLUMN "metadata" jsonb;