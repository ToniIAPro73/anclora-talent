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

  test('final CTA reuses the canonical, theme-aware ac-button focus treatment', () => {
    // The primary/secondary CTAs reuse `.ac-button` (design-system CSS),
    // whose hover/focus-visible states are driven entirely by semantic
    // tokens (--accent, --talent-button-primary-hover-surface) — no inline
    // ring-offset or hardcoded color is needed or present here anymore.
    expect(landingFinalCta).toContain('ac-button ac-button--compact ac-button--primary');
    expect(landingFinalCta).not.toContain('focus-visible:ring-offset-[#0a1120]');
    expect(landingFinalCta).not.toMatch(/#[0-9a-fA-F]{3,8}/);
  });
});
