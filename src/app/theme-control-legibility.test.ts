import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const css = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
const editorPreferences = readFileSync(resolve(process.cwd(), 'src/components/projects/EditorPreferencesPanel.tsx'), 'utf8');
const marginSelector = readFileSync(resolve(process.cwd(), 'src/components/projects/MarginSelector.tsx'), 'utf8');
const fontSelector = readFileSync(resolve(process.cwd(), 'src/components/projects/cover-studio/FontSelector.tsx'), 'utf8');
const advancedEditor = readFileSync(resolve(process.cwd(), 'src/components/projects/AdvancedRichTextEditor.tsx'), 'utf8');
const primaryRule = css.match(/\.ac-button--primary\s*\{([^}]+)\}/)?.[1] ?? '';
const selectedRule = css.match(/\.ac-button--active,[\s\S]*?\{([^}]+)\}/)?.[1] ?? '';
const contains = (value: string) => css.includes(value);

function luminance(hex: string): number {
  const [red, green, blue] = hex.slice(1).match(/.{2}/g)!.map((value) => Number.parseInt(value, 16) / 255);
  const linear = [red, green, blue].map((value) => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(foreground: string, background: string): number {
  const values = [luminance(foreground), luminance(background)].sort((first, second) => second - first);
  return (values[0] + 0.05) / (values[1] + 0.05);
}

describe('theme-aware control legibility', () => {
  test('canonical primary buttons consume paired theme-specific surface and foreground tokens', () => {
    expect(primaryRule).toContain('var(--button-primary-bg)');
    expect(primaryRule).toContain('var(--button-primary-fg)');
    expect(contains('--button-primary-bg: #C7DFE1;')).toBe(true);
    expect(contains('--button-primary-fg: #12384A;')).toBe(true);
    expect(contains('--button-primary-bg: linear-gradient(135deg, #5CB4E8 0%, #4A9FD8 52%, #3A88BE 100%);')).toBe(true);
    expect(contains('--button-primary-fg: #081019;')).toBe(true);
  });

  test('selected controls use a quieter theme-specific pairing instead of the CTA pairing', () => {
    expect(selectedRule).toContain('var(--talent-button-selected-bg)');
    expect(selectedRule).toContain('var(--talent-button-selected-fg)');
    expect(contains('--talent-button-selected-bg: #DCECF7;')).toBe(true);
    expect(contains('--talent-button-selected-fg: #12384A;')).toBe(true);
    expect(contains('--talent-button-selected-bg: #1E455C;')).toBe(true);
    expect(contains('--talent-button-selected-fg: #EDF2F8;')).toBe(true);
  });

  test('specialized workspace primaries share the canonical theme pair', () => {
    for (const family of ['pw', 'cw', 'aw', 'ew']) {
      const rule = css.match(new RegExp(`\\.${family}-button--primary\\s*\\{([^}]+)\\}`))?.[1] ?? '';
      expect(rule, `${family} primary button`).toContain('var(--button-primary-bg)');
      expect(rule, `${family} primary button`).toContain('var(--button-primary-fg)');
    }
  });

  test('editor preference, margin, font, and text-color selections use the selected-state pair', () => {
    expect(editorPreferences).toContain('bg-[var(--talent-button-selected-bg)] text-[var(--talent-button-selected-fg)]');
    expect(marginSelector).toContain('bg-[var(--talent-button-selected-bg)]');
    expect(fontSelector).toContain('bg-[var(--talent-button-selected-bg)]');
    expect(fontSelector).toContain('text-[var(--talent-button-selected-fg)]');
    expect(advancedEditor).toContain('bg-[var(--talent-button-selected-bg)]');
    expect(advancedEditor).toContain('text-[var(--talent-button-selected-fg)]');
    expect(advancedEditor).not.toContain('shadow-[0_0_15px_rgba(45,212,191,0.5)]');
  });

  test('theme controls have focus and disabled foreground tokens without opacity-only treatment', () => {
    expect(contains('--talent-button-disabled-fg: #526879;')).toBe(true);
    expect(contains('--talent-button-disabled-fg: #8AA0B4;')).toBe(true);
    expect(css).toContain('var(--button-focus-ring)');
  });

  test('primary, selected, and disabled label pairings meet WCAG AA for normal text', () => {
    const pairs = [
      ['#12384A', '#C7DFE1'],
      ['#081019', '#5CB4E8'],
      ['#081019', '#4A9FD8'],
      ['#081019', '#3A88BE'],
      ['#12384A', '#DCECF7'],
      ['#EDF2F8', '#1E455C'],
      ['#526879', '#E8F0F8'],
      ['#8AA0B4', '#162535'],
    ];

    for (const [foreground, background] of pairs) {
      expect(contrastRatio(foreground, background), `${foreground} on ${background}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});
