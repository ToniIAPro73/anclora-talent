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

describe('brand logo contract', () => {
  test('uses the uploaded Anclora Talent brand asset in landing and app shell', () => {
    expect(landingHero).toContain('BrandLogo');
    expect(appShell).toContain('BrandLogo');
    expect(brandLogo).toContain('/brand/logo-anclora-talent.png');
  });
});
