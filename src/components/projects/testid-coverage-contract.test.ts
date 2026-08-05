import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const PROJECTS_DIR = resolve(process.cwd(), 'src/components/projects');

function collectTsx(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return collectTsx(full);
    return full.endsWith('.tsx') && !full.endsWith('.test.tsx') ? [full] : [];
  });
}

// Extracts the full opening tag starting at `start`, balancing JSX braces so
// `>` inside arrow functions (`onClick={() => ...}`) does not end the tag early.
function extractTag(src: string, start: number): string {
  let depth = 0;
  for (let i = start; i < src.length; i += 1) {
    const char = src[i];
    if (char === '{') depth += 1;
    else if (char === '}') depth -= 1;
    else if (char === '>' && depth === 0) return src.slice(start, i + 1);
  }
  return src.slice(start, start + 200);
}

describe('M1 testid coverage contract', () => {
  const files = collectTsx(PROJECTS_DIR);

  test('finds project components to scan', () => {
    expect(files.length).toBeGreaterThan(20);
  });

  test('every native interactive control carries a data-testid', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      const pattern = /<(button|input|select|a)\b/g;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(src)) !== null) {
        const tag = extractTag(src, match.index);
        if (match[1] === 'a' && !tag.includes('role="button"')) continue;
        if (!tag.includes('data-testid')) {
          const line = src.slice(0, match.index).split('\n').length;
          offenders.push(`${file.replace(`${process.cwd()}/`, '')}:${line} <${match[1]}>`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  test('component wrappers with onClick expose a testid prop', () => {
    const offenders: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, 'utf8');
      const pattern = /<([A-Z]\w+)\s/g;
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(src)) !== null) {
        const tag = extractTag(src, match.index);
        if (!tag.includes('onClick')) continue;
        if (tag.includes('data-testid') || tag.includes('dataTestId')) continue;
        const line = src.slice(0, match.index).split('\n').length;
        offenders.push(`${file.replace(`${process.cwd()}/`, '')}:${line} <${match[1]}>`);
      }
    }
    expect(offenders).toEqual([]);
  });
});
