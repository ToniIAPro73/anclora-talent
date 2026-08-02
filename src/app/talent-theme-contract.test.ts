import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const globalsCss = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
const paletteDoc = readFileSync(
  resolve(process.cwd(), 'docs/standards/TALENT_COLOR_PALETTE.md'),
  'utf8',
);

describe('Anclora Talent premium palette contract', () => {
  test('applies the contractual sky-blue accent tokens in globals.css', () => {
    expect(globalsCss).toContain('--background: #0b313f;');
    expect(globalsCss).toContain('--accent: #4A9FD8;');
    expect(globalsCss).toContain('--accent-hover: #5CB4E8;');
    expect(globalsCss).toContain('--accent-dim: #3A88BE;');
    expect(globalsCss).toContain('--button-highlight-fg: #050b12;');
    expect(globalsCss).toContain('--button-highlight-border: rgba(5, 11, 18, 0.24);');
    expect(globalsCss).toContain('--surface-elevated: linear-gradient(180deg, rgba(18, 74, 80, 0.96) 0%, rgba(7, 37, 47, 0.98) 100%);');
  });

  test('keeps the same contractual accent hex values in both themes', () => {
    const accentMatches = globalsCss.match(/--accent: #4A9FD8;/g) ?? [];
    expect(accentMatches).toHaveLength(2);
    const hoverMatches = globalsCss.match(/--accent-hover: #5CB4E8;/g) ?? [];
    expect(hoverMatches).toHaveLength(2);
    const dimMatches = globalsCss.match(/--accent-dim: #3A88BE;/g) ?? [];
    expect(dimMatches).toHaveLength(2);
  });

  test('has no structural gold accent left in globals.css', () => {
    expect(globalsCss).not.toMatch(/--accent-mint/);
    expect(globalsCss).not.toMatch(/#c49a24/i);
    expect(globalsCss).not.toMatch(/#d4af37/i);
  });

  test('documents the sky-blue, deep teal and navy palette in the contract file', () => {
    expect(paletteDoc).toContain('quiet luxury');
    expect(paletteDoc).toContain('#4A9FD8');
    expect(paletteDoc).toContain('#0B313F');
    expect(paletteDoc).toContain('#C07860');
    expect(paletteDoc).toContain('ANCLORA_BRANDING_MASTER_CONTRACT');
  });
});
