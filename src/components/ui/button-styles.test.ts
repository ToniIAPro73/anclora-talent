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

  test('keeps the dark product CTA as a system button with a local Talent modifier', () => {
    expect(premiumPrimaryDarkButton).toContain('ac-button');
    expect(premiumPrimaryDarkButton).toContain('ac-button--secondary');
    expect(premiumPrimaryDarkButton).toContain('talent-button--dark');
  });

  test('keeps the neutral CTA on the canonical secondary button contract', () => {
    expect(premiumSecondaryLightButton).toContain('ac-button');
    expect(premiumSecondaryLightButton).toContain('ac-button--secondary');
    expect(premiumSecondaryLightButton).toContain('talent-button--secondary');
  });
});
