import os from 'os';
import { execFileSync } from 'child_process';

/** Locate the platform's LibreOffice executable without assuming a local install. */
export function findLibreOfficeBinary(): string | null {
  const isMac = process.platform === 'darwin';
  const isWin = process.platform === 'win32';

  if (isMac) {
    const candidates = [
      '/Applications/LibreOffice.app/Contents/MacOS/soffice',
      `${os.homedir()}/Applications/LibreOffice.app/Contents/MacOS/soffice`,
      '/opt/homebrew/bin/soffice',
      '/usr/local/bin/soffice',
    ];
    const bundled = resolveFromSystem('soffice', candidates);
    if (bundled) return bundled;
  }

  if (isWin) {
    const candidates = [
      `${process.cwd()}/tools/libreoffice/program/soffice.exe`,
      `${process.cwd()}/tools/LibreOffice/program/soffice.exe`,
      'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      'C:\\Program Files (x86)\\LibreOffice\\program\\soffice.exe',
    ];
    const bundled = resolveFromSystem('soffice.exe', candidates);
    if (bundled) return bundled;
  }

  const binNames = isWin ? ['soffice.exe', 'soffice.com'] : ['soffice', 'libreoffice'];
  for (const bin of binNames) {
    const resolved = resolveFromSystem(bin, []);
    if (resolved) return resolved;
  }

  return null;
}

function resolveFromSystem(command: string, candidates: string[]): string | null {
  for (const candidate of candidates) {
    try {
      const resolved = execFileSync(process.platform === 'win32' ? 'where.exe' : 'which', [candidate], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim().split(/\r?\n/)[0];
      if (resolved) return resolved;
    } catch {
      // The candidate is not installed or is not executable.
    }
  }

  try {
    const resolved = execFileSync(process.platform === 'win32' ? 'where.exe' : 'which', [command], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim().split(/\r?\n/)[0];
    return resolved || null;
  } catch {
    return null;
  }
}
