import { migrate } from 'drizzle-orm/neon-http/migrator';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';

/**
 * Database Migration Script
 *
 * NOTE ON PROJECT GOVERNANCE (.anclora/PRODUCTION_RUNTIME.md):
 * Anclora Talent canonically uses SCHEMA_PUSH (`npm run db:push`) for production schema management.
 * Versioned SQL migrations in `src/db/migrations/` serve as the schema changelog and for provisioning
 * fresh/isolated databases (e.g. CI, ephemeral testing schemas).
 *
 * Running `migrate()` against an existing database whose tables were created via `db:push`
 * (without a `drizzle.__drizzle_migrations` history table) will attempt to execute all migrations from 0000,
 * which will fail on already existing tables.
 *
 * To run this script safely against fresh environments or explicit targets, set ALLOW_MIGRATE=true.
 */

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL environment variable is not set');
  process.exit(1);
}

if (process.env.ALLOW_MIGRATE !== 'true') {
  console.error(
    '✗ Direct execution of scripts/migrate.ts is blocked.\n' +
    '  Anclora Talent production uses SCHEMA_PUSH (`npm run db:push`) per .anclora/PRODUCTION_RUNTIME.md.\n' +
    '  If you intend to run this against a fresh/ephemeral database, rerun with ALLOW_MIGRATE=true.'
  );
  process.exit(1);
}

const sql = neon(databaseUrl);
const db = drizzle(sql);

async function runMigrations() {
  try {
    console.log('Running database migrations...');
    await migrate(db, { migrationsFolder: './src/db/migrations' });
    console.log('✓ Migrations completed successfully');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
