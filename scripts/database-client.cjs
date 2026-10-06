const { Pool } = require('pg');
const { neon } = require('@neondatabase/serverless');

const LOCAL_DATABASE_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1']);

function isLocalDatabaseUrl(databaseUrl) {
  try {
    const hostname = new URL(databaseUrl).hostname.replace(/^\[|\]$/g, '');
    return LOCAL_DATABASE_HOSTNAMES.has(hostname);
  } catch {
    return false;
  }
}

function createDatabaseClient(databaseUrl) {
  if (isLocalDatabaseUrl(databaseUrl)) {
    const pool = new Pool({ connectionString: databaseUrl });
    return {
      query: (text, values) => pool.query(text, values),
      close: () => pool.end(),
    };
  }

  const sql = neon(databaseUrl);
  return {
    query: (text, values) => sql.query(text, values),
    close: async () => undefined,
  };
}

module.exports = { createDatabaseClient, isLocalDatabaseUrl };
