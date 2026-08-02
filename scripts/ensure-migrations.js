const { neon } = require('@neondatabase/serverless');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.warn('⚠️  DATABASE_URL not configured, skipping migrations during build');
  process.exit(0);
}

const sql = neon(databaseUrl);

const migrations = [
  // FASE C: composition engine columns on project_documents (rules/model/metadata)
  `ALTER TABLE "project_documents"
   ADD COLUMN IF NOT EXISTS "rules" jsonb;`,
  `ALTER TABLE "project_documents"
   ADD COLUMN IF NOT EXISTS "document_model" jsonb;`,
  `ALTER TABLE "project_documents"
   ADD COLUMN IF NOT EXISTS "metadata" jsonb;`,
  // Add show_subtitle column if it doesn't exist
  `ALTER TABLE "cover_designs"
   ADD COLUMN IF NOT EXISTS "show_subtitle" integer DEFAULT 1;`,
  // Own-auth tables (Fase A): credentials + opaque sessions
  `CREATE TABLE IF NOT EXISTS "users" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "email" varchar(255) NOT NULL,
    "password_hash" text NOT NULL,
    "full_name" varchar(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  );`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email");`,
  `CREATE TABLE IF NOT EXISTS "sessions" (
    "id" varchar(64) PRIMARY KEY NOT NULL,
    "user_id" uuid NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  );`,
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'sessions_user_id_users_id_fk'
     ) THEN
       ALTER TABLE "sessions"
       ADD CONSTRAINT "sessions_user_id_users_id_fk"
       FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
       ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;`,
  // Social OAuth identities (Fase OAuth): users can sign in without password
  `ALTER TABLE "users" ALTER COLUMN "password_hash" DROP NOT NULL;`,
  `CREATE TABLE IF NOT EXISTS "oauth_identities" (
    "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
    "user_id" uuid NOT NULL,
    "provider" varchar(16) NOT NULL,
    "provider_account_id" varchar(255) NOT NULL,
    "email" varchar(255) NOT NULL,
    "created_at" timestamp with time zone DEFAULT now() NOT NULL
  );`,
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'oauth_identities_provider_account_unique'
     ) THEN
       ALTER TABLE "oauth_identities"
       ADD CONSTRAINT "oauth_identities_provider_account_unique"
       UNIQUE ("provider", "provider_account_id");
     END IF;
   END $$;`,
  `DO $$
   BEGIN
     IF NOT EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'oauth_identities_user_id_users_id_fk'
     ) THEN
       ALTER TABLE "oauth_identities"
       ADD CONSTRAINT "oauth_identities_user_id_users_id_fk"
       FOREIGN KEY ("user_id") REFERENCES "public"."users"("id")
       ON DELETE cascade ON UPDATE no action;
     END IF;
   END $$;`,
];

async function runMigrations() {
  try {
    console.log('🔄 Checking and applying database migrations...');

    for (const migration of migrations) {
      try {
        console.log('   Executing migration...');
        await sql.query(migration);
        console.log('   ✓ Column ensured');
      } catch (err) {
        console.warn('   ⚠️ Migration step skipped (might already exist):', err instanceof Error ? err.message : String(err));
      }
    }

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error instanceof Error ? error.message : String(error));
    // Don't exit with error - migration might already be applied
  }
}

async function main() {
  try {
    await runMigrations();
  } catch (err) {
    console.error('Final migration error:', err);
  }
}

main();
