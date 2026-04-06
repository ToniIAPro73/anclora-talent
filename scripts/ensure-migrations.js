const { neon } = require('@neondatabase/serverless');

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL not configured');
  process.exit(1);
}

const sql = neon(databaseUrl);

const migrations = [
  // Add show_subtitle column if it doesn't exist
  `ALTER TABLE "cover_designs"
   ADD COLUMN IF NOT EXISTS "show_subtitle" integer DEFAULT 1;`,
];

async function runMigrations() {
  try {
    console.log('🔄 Checking and applying database migrations...');

    for (const migration of migrations) {
      console.log('   Executing: ALTER TABLE cover_designs ADD COLUMN show_subtitle');
      const result = await sql(migration);
      console.log('   ✓ Column ensured');
    }

    console.log('✅ All migrations completed successfully');
  } catch (error) {
    console.error('❌ Migration failed:', error instanceof Error ? error.message : String(error));
    // Don't exit with error - migration might already be applied
  }
}

runMigrations().catch(err => {
  console.error('Migration error:', err);
});
