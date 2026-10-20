import {
  premiumPrimaryDarkButton,
  premiumPrimaryMintButton,
  premiumSecondaryLightButton,
} from './button-styles';

describe('button styles', () => {
  test('maps the highlighted CTA to the canonical primary button', () => {
    expect(premiumPrimaryMintButton).toContain('ac-button');
    expect(premiumPrimaryMintButton).toContain('ac-button--primary');
    expect(premiumPrimaryMintButton).toContain('ac-button--lg');
  });

  test('maps the product CTA to the same theme-aware canonical primary variant', () => {
    expect(premiumPrimaryDarkButton).toContain('ac-button');
    expect(premiumPrimaryDarkButton).toContain('ac-button--primary');
    expect(premiumPrimaryDarkButton).toContain('ac-button--lg');
    expect(premiumPrimaryDarkButton).not.toContain('talent-button--dark');
  });

  test('keeps the neutral CTA on the canonical secondary button contract', () => {
    expect(premiumSecondaryLightButton).toContain('ac-button');
    expect(premiumSecondaryLightButton).toContain('ac-button--secondary');
    expect(premiumSecondaryLightButton).toContain('talent-button--secondary');
  });
});
