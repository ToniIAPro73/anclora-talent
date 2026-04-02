import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const landingHero = readFileSync(
  resolve(process.cwd(), 'src/components/marketing/landing-hero.tsx'),
  'utf8',
);
const landingFinalCta = readFileSync(
  resolve(process.cwd(), 'src/components/marketing/landing-final-cta.tsx'),
  'utf8',
);

describe('landing theme contract', () => {
  test('avoids hardcoded dark-only gradients in the landing hero', () => {
    expect(landingHero).toContain('bg-[var(--shell-main-surface)]');
    expect(landingHero).toContain('bg-[var(--surface-elevated)]');
    expect(landingHero).not.toContain('linear-gradient(180deg,_#07252f_0%,_#0b313f_46%,_#0b133f_100%)');
    expect(landingHero).not.toContain('linear-gradient(180deg,_rgba(7,37,47,0.92)_0%,_rgba(11,19,63,0.96)_100%)');
  });

  test('uses theme-aware focus offsets in final CTA', () => {
    expect(landingFinalCta).toContain('focus-visible:ring-offset-[var(--background)]');
    expect(landingFinalCta).not.toContain('focus-visible:ring-offset-[#0a1120]');
  });
});
