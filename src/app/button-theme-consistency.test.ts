import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const globalsCss = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('button theme consistency contract', () => {
  test('keeps a stable foreground for gold highlight buttons across themes', () => {
    const highlightMatches = globalsCss.match(/--button-highlight-fg: #050b12;/g) ?? [];
    expect(highlightMatches).toHaveLength(2);
  });

  test('keeps a stable foreground for teal primary buttons across themes', () => {
    const primaryMatches = globalsCss.match(/--button-primary-fg: #fffdf8;/g) ?? [];
    expect(primaryMatches).toHaveLength(2);
  });
});
