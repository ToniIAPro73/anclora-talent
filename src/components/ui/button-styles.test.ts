import {
  premiumPrimaryDarkButton,
  premiumPrimaryMintButton,
  premiumSecondaryLightButton,
} from './button-styles';

describe('button styles', () => {
  test('defines a high-contrast mint CTA for highlighted actions', () => {
    expect(premiumPrimaryMintButton).toContain('bg-[var(--button-highlight-bg)]');
    expect(premiumPrimaryMintButton).toContain('text-[var(--button-highlight-fg)]');
    expect(premiumPrimaryMintButton).toContain('font-bold');
    expect(premiumPrimaryMintButton).toContain('text-base');
    expect(premiumPrimaryMintButton).toContain('border-[var(--button-highlight-border)]');
    expect(premiumPrimaryMintButton).toContain('min-h-12');
    expect(premiumPrimaryMintButton).toContain('justify-center');
  });

  test('defines a high-contrast dark CTA for primary product actions', () => {
    expect(premiumPrimaryDarkButton).toContain('bg-[var(--button-primary-bg)]');
    expect(premiumPrimaryDarkButton).toContain('text-[var(--button-primary-fg)]');
    expect(premiumPrimaryDarkButton).toContain('min-h-12');
    expect(premiumPrimaryDarkButton).toContain('whitespace-nowrap');
  });

  test('defines a readable dark secondary CTA for neutral actions', () => {
    expect(premiumSecondaryLightButton).toContain('border-[var(--button-secondary-border)]');
    expect(premiumSecondaryLightButton).toContain('text-[var(--button-secondary-fg)]');
    expect(premiumSecondaryLightButton).toContain('border');
  });
});
