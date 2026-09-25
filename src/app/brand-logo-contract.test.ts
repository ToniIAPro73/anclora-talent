import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, test } from 'vitest';

const landingHero = readFileSync(
  resolve(process.cwd(), 'src/components/marketing/landing-hero.tsx'),
  'utf8',
);
const appShell = readFileSync(
  resolve(process.cwd(), 'src/components/layout/AppShell.tsx'),
  'utf8',
);
const brandLogo = readFileSync(
  resolve(process.cwd(), 'src/components/brand/BrandLogo.tsx'),
  'utf8',
);

const landingHeader = readFileSync(
  resolve(process.cwd(), 'src/components/marketing/landing-header.tsx'),
  'utf8',
);

describe('brand logo contract', () => {
  test('uses the uploaded Anclora Talent brand asset in landing and app shell', () => {
    expect(landingHero).toContain('BrandLogo');
    expect(appShell).toContain('BrandLogo');
    // The asset path lives in TALENT_BRAND.logoPath (asserted in talent-brand.test.ts);
    // BrandLogo must render it without the legacy circular crop.
    expect(brandLogo).toContain('TALENT_BRAND.logoPath');
    expect(brandLogo).toContain('object-contain');
    expect(brandLogo).not.toContain('rounded-full');
  });

  test('normalizes header logo symbol size to 32px across landing and authenticated app shell', () => {
    expect(landingHeader).toContain('<BrandLogo size={32}');
    expect(appShell).toContain('<BrandLogo size={32}');
    expect(brandLogo).toContain('size = 32');
  });
});
