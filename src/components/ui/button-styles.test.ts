import {
  premiumPrimaryDarkButton,
  premiumPrimaryMintButton,
  premiumSecondaryLightButton,
} from './button-styles';

describe('button styles', () => {
  test('defines a high-contrast mint CTA for highlighted actions', () => {
    expect(premiumPrimaryMintButton).toContain('bg-[#8ce9de]');
    expect(premiumPrimaryMintButton).toContain('text-[#07111f]');
    expect(premiumPrimaryMintButton).toContain('min-h-12');
    expect(premiumPrimaryMintButton).toContain('justify-center');
  });

  test('defines a high-contrast dark CTA for primary product actions', () => {
    expect(premiumPrimaryDarkButton).toContain('bg-[#07111f]');
    expect(premiumPrimaryDarkButton).toContain('text-[#f8f4eb]');
    expect(premiumPrimaryDarkButton).toContain('min-h-12');
    expect(premiumPrimaryDarkButton).toContain('whitespace-nowrap');
  });

  test('defines a readable light secondary CTA for neutral actions', () => {
    expect(premiumSecondaryLightButton).toContain('bg-white');
    expect(premiumSecondaryLightButton).toContain('text-slate-950');
    expect(premiumSecondaryLightButton).toContain('border');
  });
});
