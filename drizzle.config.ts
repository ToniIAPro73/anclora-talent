import { defineConfig } from 'drizzle-kit';

// drizzle-kit selects the native `pg` driver when it is installed. This keeps
// localhost PostgreSQL on TCP/pg while remote URLs retain Neon compatibility.
export default defineConfig({
  schema: './src/lib/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? '',
  },
  strict: true,
});
