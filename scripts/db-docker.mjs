import { spawn, spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'dotenv';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const env = parse(await readFile(path.join(repoRoot, '.env.local')));
const command = process.argv[2];
const allowed = new Map([['push', 'drizzle-kit push'], ['studio', 'drizzle-kit studio']]);
if (!allowed.has(command)) throw new Error('Usage: node scripts/db-docker.mjs <push|studio>');
if (!env.DATABASE_URL_DOCKER) throw new Error('DATABASE_URL_DOCKER is missing from .env.local');

const inspected = spawnSync('docker', ['inspect', '--format', '{{.State.Running}}', 'anclora-talent-postgres'], { encoding: 'utf8' });
if (inspected.status !== 0) throw new Error('Docker container anclora-talent-postgres is unavailable.');
if (inspected.stdout.trim() !== 'true') {
  const started = spawnSync('docker', ['start', 'anclora-talent-postgres'], { stdio: 'ignore' });
  if (started.status !== 0) throw new Error('Could not start Docker container anclora-talent-postgres.');
}

const [bin, ...args] = allowed.get(command).split(' ');
const child = spawn(path.join(repoRoot, 'node_modules/.bin', bin), args, {
  cwd: repoRoot,
  env: { ...process.env, DATABASE_URL: env.DATABASE_URL_DOCKER, DATABASE_URL_UNPOOLED: env.DATABASE_URL_DOCKER_UNPOOLED || env.DATABASE_URL_DOCKER },
  stdio: 'inherit',
});
child.once('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.once('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
