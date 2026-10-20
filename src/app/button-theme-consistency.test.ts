import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const globalsCss = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('button theme consistency contract', () => {
  test('keeps a stable foreground for accent highlight buttons across themes', () => {
    const highlightMatches = globalsCss.match(/--button-highlight-fg: #050b12;/g) ?? [];
    expect(highlightMatches).toHaveLength(2);
  });

  test('pairs primary button backgrounds with theme-specific readable foregrounds', () => {
    expect(globalsCss).toContain('--button-primary-bg: linear-gradient(135deg, #5CB4E8 0%, #4A9FD8 52%, #3A88BE 100%);');
    expect(globalsCss).toContain('--button-primary-fg: #081019;');
    expect(globalsCss).toContain('--button-primary-bg: #C7DFE1;');
    expect(globalsCss).toContain('--button-primary-fg: #12384A;');
  });
});
