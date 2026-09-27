import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { pathToFileURL } from 'url';

const execFileAsync = promisify(execFile);

/**
 * Platform-aware discovery of LibreOffice/soffice binary.
 * macOS: check standard Applications bundle and PATH.
 * Linux: check PATH (libreoffice, soffice).
 * Windows: check local tools or PATH.
 */
export function findLibreOfficeBinary(): string | null {
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';

  if (isMac) {
    const candidates = [
      '/Applications/LibreOffice.app/Contents/MacOS/soffice',
      path.join(os.homedir(), 'Applications', 'LibreOffice.app', 'Contents', 'MacOS', 'soffice'),
      '/opt/homebrew/bin/soffice',
      '/usr/local/bin/soffice',
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  if (isWin) {
    const cwd = /* turbopackIgnore: true */ process.cwd();
    const candidates = [
      path.resolve(cwd, 'tools', 'libreoffice', 'program', 'soffice.exe'),
      path.resolve(cwd, 'tools', 'LibreOffice', 'program', 'soffice.exe'),
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  // Generic PATH check via environment
  const pathEnv = process.env.PATH || '';
  const pathSeparator = isWin ? ';' : ':';
  const binNames = isWin ? ['soffice.exe', 'soffice.com'] : ['soffice', 'libreoffice'];

  for (const dir of pathEnv.split(pathSeparator)) {
    if (!dir) continue;
    for (const bin of binNames) {
      const fullPath = path.join(dir, bin);
      try {
        if (fs.existsSync(fullPath)) return fullPath;
      } catch {
        // ignore access errors on unreadable directories
      }
    }
  }

  return null;
}

/**
 * Normalizes a legacy binary .doc buffer to modern .docx using headless LibreOffice.
 * Returns the converted .docx buffer, or null if LibreOffice is unavailable.
 */
export async function normalizeDocToDocx(
  docBuffer: Buffer,
): Promise<{ docxBuffer: Buffer; source: 'libreoffice' } | null> {
  if (!docBuffer || docBuffer.length < 512) {
    return null;
  }

  const binary = findLibreOfficeBinary();
  if (!binary) {
    return null;
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'anclora-talent-doc-'));
  const inputDocPath = path.join(tmpDir, 'source.doc');
  const profileDir = path.join(tmpDir, 'profile');
  fs.mkdirSync(profileDir, { recursive: true });

  try {
    fs.writeFileSync(inputDocPath, docBuffer);

    const userInstallArg = `-env:UserInstallation=${pathToFileURL(profileDir).href}`;
    await execFileAsync(
      binary,
      [
        '--headless',
        '--norestore',
        '--nodefault',
        '--nofirststartwizard',
        '--nolockcheck',
        userInstallArg,
        '--convert-to',
        'docx:MS Word 2007 XML',
        '--outdir',
        tmpDir,
        inputDocPath,
      ],
      {
        timeout: 45000,
        windowsHide: true,
      },
    );

    const outputDocxPath = path.join(tmpDir, 'source.docx');
    if (!fs.existsSync(outputDocxPath)) {
      console.warn('[doc-normalizer] LibreOffice executed but output .docx not found', { tmpDir });
      return null;
    }

    const docxBuffer = fs.readFileSync(outputDocxPath);
    return { docxBuffer, source: 'libreoffice' };
  } catch (error) {
    console.warn('[doc-normalizer] LibreOffice conversion failed', error);
    return null;
  } finally {
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Best-effort cleanup
    }
  }
}
