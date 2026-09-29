import 'server-only';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { findLibreOfficeBinary } from './doc-normalizer';

const execFileAsync = promisify(execFile);

/** Render source pages with the approved Office renderer when the runtime has
 * LibreOffice and Poppler. Serverless runtimes may return null; callers must
 * preserve UNVERIFIED instead of fabricating certification. */
export async function renderAuthoritativeSourcePages(fileName: string, buffer: Buffer): Promise<string[] | null> {
  const soffice = findLibreOfficeBinary();
  if (!soffice) return null;
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), 'anclora-source-page-map-'));
  try {
    const inputPath = path.join(workDir, fileName.replace(/[^a-z0-9._-]/gi, '_'));
    await fs.writeFile(inputPath, buffer);
    await execFileAsync(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', workDir, inputPath], { timeout: 120_000 });
    const pdfPath = path.join(workDir, `${path.basename(inputPath, path.extname(inputPath))}.pdf`);
    const { stdout: info } = await execFileAsync('pdfinfo', [pdfPath], { timeout: 30_000 });
    const pageCount = Number(info.match(/^Pages:\s+(\d+)/m)?.[1] ?? 0);
    if (!Number.isFinite(pageCount) || pageCount < 1) return null;
    const pages: string[] = [];
    for (let page = 1; page <= pageCount; page += 1) {
      const { stdout } = await execFileAsync('pdftotext', ['-layout', '-f', String(page), '-l', String(page), pdfPath, '-'], { timeout: 30_000 });
      pages.push(stdout);
    }
    return pages;
  } catch {
    return null;
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => undefined);
  }
}
