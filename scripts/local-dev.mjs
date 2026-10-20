import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';
import pg from 'pg';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const localEnv = parse(await readFile(path.join(repoRoot, '.env.local')));
const forceDocker = process.argv.includes('--docker');
const fromVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);

function assertUrl(name, value) {
  if (!value) throw new Error(`${name} is missing from .env.local`);
  try { return new URL(value); } catch { throw new Error(`${name} is not a valid URL`); }
}

async function isReachable(connectionString) {
  const pool = new pg.Pool({ connectionString, connectionTimeoutMillis: 3000, max: 1 });
  try { await pool.query('SELECT 1'); return true; }
  catch { return false; }
  finally { await pool.end(); }
}

function ensureDocker() {
  const inspect = spawn('docker', ['inspect', '--format', '{{.State.Running}}', 'anclora-talent-postgres'], { stdio: 'ignore' });
  return new Promise((resolve) => {
    inspect.once('error', () => resolve(false));
    inspect.once('exit', (code) => {
      if (code !== 0) return resolve(false);
      const status = spawn('docker', ['start', 'anclora-talent-postgres'], { stdio: 'ignore' });
      status.once('error', () => resolve(false));
      status.once('exit', (startCode) => resolve(startCode === 0));
    });
  });
}

let databaseUrl;
let databaseUrlUnpooled;
let selected;

if (fromVercel) {
  databaseUrl = process.env.DATABASE_URL;
  databaseUrlUnpooled = process.env.DATABASE_URL_UNPOOLED || databaseUrl;
  if (!databaseUrl) throw new Error('Vercel runtime must provide DATABASE_URL; local Docker fallback is disabled there.');
  selected = 'Vercel platform DATABASE_URL';
} else if (forceDocker) {
  databaseUrl = localEnv.DATABASE_URL_DOCKER;
  databaseUrlUnpooled = localEnv.DATABASE_URL_DOCKER_UNPOOLED;
  assertUrl('DATABASE_URL_DOCKER', databaseUrl);
  if (!(await ensureDocker()) || !(await isReachable(databaseUrl))) {
    throw new Error('Docker PostgreSQL is not reachable. Start the anclora-talent-postgres container and retry.');
  }
  selected = 'Docker (forced)';
} else {
  const neonUrl = localEnv.DATABASE_URL_NEON;
  assertUrl('DATABASE_URL_NEON', neonUrl);
  if (await isReachable(neonUrl)) {
    databaseUrl = neonUrl;
    databaseUrlUnpooled = localEnv.DATABASE_URL_NEON_UNPOOLED;
    selected = 'Neon';
  } else {
    databaseUrl = localEnv.DATABASE_URL_DOCKER;
    databaseUrlUnpooled = localEnv.DATABASE_URL_DOCKER_UNPOOLED;
    assertUrl('DATABASE_URL_DOCKER', databaseUrl);
    if (!(await ensureDocker()) || !(await isReachable(databaseUrl))) {
      throw new Error('Neon is unreachable and Docker PostgreSQL is unavailable. Start Docker or use npm run dev:docker.');
    }
    selected = 'Docker (Neon unavailable)';
  }
}

console.log(`Starting Talent with ${selected}.`);
const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', '3000'], {
  cwd: repoRoot,
  env: {
    ...localEnv,
    ...process.env,
    DATABASE_URL: databaseUrl,
    DATABASE_URL_UNPOOLED: databaseUrlUnpooled || databaseUrl,
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    AUTH_APP_URL: 'http://localhost:3000',
    PORT: '3000',
  },
  stdio: 'inherit',
});

for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => child.kill(signal));
child.once('error', (error) => { console.error(`Could not start Next.js: ${error.message}`); process.exitCode = 1; });
child.once('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
