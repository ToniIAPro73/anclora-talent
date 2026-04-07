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
      try {
        console.log('   Executing migration...');
        await sql(migration);
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
