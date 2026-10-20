import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const envFile = path.join(repoRoot, '.env.local');
const localEnv = parse(await readFile(envFile));

if (!localEnv.E2E_AUTH_PASSWORD) {
  throw new Error('E2E_AUTH_PASSWORD must be set in .env.local');
}

process.umask(0o077);
const tempDir = await mkdtemp(path.join(os.tmpdir(), 'anclora-talent-vercel-env-'));
const vercelEnvFile = path.join(tempDir, 'development.env');

try {
  const pull = spawn('vercel', ['env', 'pull', vercelEnvFile, '--environment', 'development'], {
    cwd: repoRoot,
    stdio: 'inherit',
  });
  const pullStatus = await new Promise((resolve, reject) => {
    pull.once('error', reject);
    pull.once('exit', (code, signal) => resolve({ code, signal }));
  });

  if (pullStatus.code !== 0) {
    throw new Error(`Could not load Vercel Development environment (exit ${pullStatus.code ?? pullStatus.signal})`);
  }

  const vercelEnv = parse(await readFile(vercelEnvFile));
  if (!vercelEnv.DATABASE_URL || !vercelEnv.DATABASE_URL_UNPOOLED) {
    throw new Error('Vercel Development must provide both canonical Neon database URLs');
  }

  const databaseHost = new URL(vercelEnv.DATABASE_URL).hostname;
  if (!databaseHost.endsWith('.neon.tech')) {
    throw new Error('Vercel Development DATABASE_URL does not target the canonical Neon database');
  }

  const env = {
    ...process.env,
    ...vercelEnv,
    ...localEnv,
    DATABASE_URL: vercelEnv.DATABASE_URL,
    DATABASE_URL_UNPOOLED: vercelEnv.DATABASE_URL_UNPOOLED,
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
    AUTH_APP_URL: 'http://localhost:3000',
    PORT: '3000',
  };

  const child = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'dev', '--port', '3000'], {
    cwd: repoRoot,
    env,
    stdio: 'inherit',
  });

  const appStatus = await new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('exit', (code, signal) => resolve({ code, signal }));
  });
  process.exitCode = appStatus.code ?? (appStatus.signal ? 1 : 0);
} finally {
  await rm(tempDir, { recursive: true, force: true });
}
