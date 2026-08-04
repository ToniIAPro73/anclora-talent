import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const globalsCss = readFileSync(resolve(process.cwd(), 'src/app/globals.css'), 'utf8');
const documentImporter = readFileSync(
  resolve(process.cwd(), 'src/components/projects/DocumentImporter.tsx'),
  'utf8',
);
const userMenu = readFileSync(
  resolve(process.cwd(), 'src/components/layout/UserMenu.tsx'),
  'utf8',
);

const lightBlock = globalsCss.slice(globalsCss.indexOf('html[data-theme="light"]'));

describe('theme surface contract (document limit, user menu, CTA)', () => {
  test('document size-limit card uses theme surface tokens in both themes', () => {
    expect(documentImporter).not.toMatch(/bg-blue-50|border-blue-200|text-blue-900|text-blue-800|text-blue-600/);
    expect(documentImporter).toContain('bg-[var(--accent-soft)]');
    expect(documentImporter).toContain('border-[var(--accent-border)]');
    expect(documentImporter).toContain('text-[var(--accent-text)]');
  });

  test('user menu dropdown is an elevated surface with border and shadow', () => {
    expect(userMenu).toContain('bg-[var(--surface-elevated)]');
    expect(userMenu).toContain('border-[var(--border-strong)]');
    expect(userMenu).toContain('shadow-[var(--shadow-lg)]');
  });

  test('sign-out button reads as a button in both themes', () => {
    expect(userMenu).toContain('bg-[var(--action-secondary-bg)]');
    expect(userMenu).toContain('border-[var(--action-secondary-border)]');
    expect(userMenu).toContain('text-[var(--action-secondary-fg)]');
  });

  test('light theme CTA uses the dimmed contracted accent gradient', () => {
    expect(lightBlock).toContain(
      '--talent-button-primary-bg: linear-gradient(135deg, #4A9FD8 0%, #3A88BE 100%);',
    );
    expect(lightBlock).toContain('--talent-button-primary-fg: #081019;');
    // Dark theme keeps the contracted 3-stop gradient untouched.
    const darkBlock = globalsCss.slice(0, globalsCss.indexOf('html[data-theme="light"]'));
    expect(darkBlock).toContain(
      '--talent-button-primary-bg: linear-gradient(135deg, #5CB4E8 0%, #4A9FD8 52%, #3A88BE 100%);',
    );
  });
});
