import 'server-only';
import { createDatabase, type Database, isLocalDatabaseUrl } from './adapter';

let dbInstance: Database | null = null;

export function hasDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to access the database');
  }

  if (!dbInstance) {
    dbInstance = createDatabase(process.env.DATABASE_URL);
  }

  return dbInstance;
}

export { isLocalDatabaseUrl };
