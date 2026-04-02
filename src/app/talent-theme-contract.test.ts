import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const globalsCss = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
const paletteDoc = readFileSync(
  resolve(process.cwd(), 'docs/standards/TALENT_COLOR_PALETTE.md'),
  'utf8',
);

describe('Anclora Talent premium palette contract', () => {
  test('applies the quiet luxury palette tokens in globals.css', () => {
    expect(globalsCss).toContain('--background: #0b313f;');
    expect(globalsCss).toContain('--accent-mint: #d4af37;');
    expect(globalsCss).toContain('--button-highlight-fg: #0b1320;');
    expect(globalsCss).toContain('--surface-elevated: linear-gradient(180deg, rgba(18, 74, 80, 0.96) 0%, rgba(7, 37, 47, 0.98) 100%);');
  });

  test('documents the teal, gold and navy palette in the contract file', () => {
    expect(paletteDoc).toContain('quiet luxury');
    expect(paletteDoc).toContain('#07252F');
    expect(paletteDoc).toContain('#124A50');
    expect(paletteDoc).toContain('#D4AF37');
    expect(paletteDoc).toContain('#0B313F');
  });
});
