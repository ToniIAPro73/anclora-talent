ALTER TABLE "projects"
ADD COLUMN IF NOT EXISTS "workflow_step" integer NOT NULL DEFAULT 1;
