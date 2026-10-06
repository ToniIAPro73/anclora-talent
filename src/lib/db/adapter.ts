import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzleNodePostgres } from 'drizzle-orm/node-postgres';
import { neon } from '@neondatabase/serverless';
import { Pool } from 'pg';
import * as schema from './schema';

export type Database = ReturnType<typeof drizzleNeon<typeof schema>>;

const LOCAL_DATABASE_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

export function isLocalDatabaseUrl(databaseUrl: string): boolean {
  try {
    const hostname = new URL(databaseUrl).hostname.replace(/^\[|\]$/g, '');
    return LOCAL_DATABASE_HOSTNAMES.has(hostname);
  } catch {
    return false;
  }
}

export function createDatabase(databaseUrl: string): Database {
  if (isLocalDatabaseUrl(databaseUrl)) {
    const pool = new Pool({ connectionString: databaseUrl });
    return drizzleNodePostgres(pool, { schema }) as unknown as Database;
  }

  const sql = neon(databaseUrl);
  return drizzleNeon(sql, { schema });
}
