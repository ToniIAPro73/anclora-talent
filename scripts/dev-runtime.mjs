import { spawn, spawnSync } from 'node:child_process';
import { loadEnvConfig } from '@next/env';
import { Pool } from 'pg';

const TALENT_POSTGRES_CONTAINER = 'anclora-talent-postgres';
const LOCAL_DATABASE_ENV = 'DATABASE_URL_DOCKER';
const CONNECTION_TIMEOUT_MS = 4_000;

loadEnvConfig(process.cwd());

function isVercelRuntime() {
  return Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
}

function isLocalDatabaseUrl(databaseUrl) {
  try {
    const hostname = new URL(databaseUrl).hostname.replace(/^\[|\]$/g, '');
    return ['localhost', '127.0.0.1', '::1'].includes(hostname);
  } catch {
    return false;
  }
}

async function canConnect(databaseUrl) {
  const pool = new Pool({ connectionString: databaseUrl, connectionTimeoutMillis: CONNECTION_TIMEOUT_MS, max: 1 });
  try {
    await pool.query('SELECT 1');
    return true;
  } catch {
    return false;
  } finally {
    await pool.end();
  }
}

function ensureTalentPostgresIsRunning() {
  const status = spawnSync('docker', ['inspect', '--format={{.State.Running}}', TALENT_POSTGRES_CONTAINER], {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  });

  if (status.status === 0 && status.stdout.trim() === 'true') return true;
  if (status.status !== 0) return false;

  return spawnSync('docker', ['start', TALENT_POSTGRES_CONTAINER], {
    encoding: 'utf8',
    stdio: ['ignore', 'ignore', 'ignore'],
  }).status === 0;
}

async function selectLocalDatabase() {
  const configuredDatabase = process.env.DATABASE_URL || process.env.DATABASE_URL_NEON;
  if (configuredDatabase && isLocalDatabaseUrl(configuredDatabase) && await canConnect(configuredDatabase)) {
    return 'configured local PostgreSQL';
  }

  if (configuredDatabase && !isLocalDatabaseUrl(configuredDatabase) && await canConnect(configuredDatabase)) {
    return 'Neon';
  }

  const dockerDatabase = process.env[LOCAL_DATABASE_ENV];
  if (!dockerDatabase || !isLocalDatabaseUrl(dockerDatabase)) {
    throw new Error(`${LOCAL_DATABASE_ENV} debe existir en .env.local y apuntar a localhost para habilitar el fallback Docker de Talent.`);
  }

  if (!ensureTalentPostgresIsRunning()) {
    throw new Error(`No se pudo iniciar el contenedor ${TALENT_POSTGRES_CONTAINER}. Comprueba que Docker esté disponible.`);
  }

  if (!await canConnect(dockerDatabase)) {
    throw new Error(`El contenedor ${TALENT_POSTGRES_CONTAINER} está disponible, pero PostgreSQL no acepta la conexión local configurada.`);
  }

  process.env.DATABASE_URL = dockerDatabase;
  return 'Docker PostgreSQL local';
}

const nextCli = new URL('../node_modules/next/dist/bin/next', import.meta.url).pathname;

if (isVercelRuntime()) {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL no está configurada para Vercel. Docker no se utiliza en este entorno.');
    process.exit(1);
  }
  const next = spawn(process.execPath, [nextCli, 'dev', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
  next.on('exit', (code, signal) => process.exit(signal ? 1 : code ?? 1));
} else {
  try {
    const databaseMode = await selectLocalDatabase();
    console.info(`Anclora Talent local: base de datos seleccionada (${databaseMode}).`);
    const next = spawn(process.execPath, [nextCli, 'dev', ...process.argv.slice(2)], { stdio: 'inherit', env: process.env });
    next.on('exit', (code, signal) => process.exit(signal ? 1 : code ?? 1));
  } catch (error) {
    console.error(`No se pudo preparar la base de datos local de Anclora Talent: ${error.message}`);
    process.exit(1);
  }
}
