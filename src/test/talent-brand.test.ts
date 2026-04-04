import { TALENT_BRAND } from '@/lib/talent-brand'
import { describe, it, expect } from 'vitest'

describe('talent branding contract', () => {
  it('stays aligned with premium branding', () => {
    expect(TALENT_BRAND.name).toBe('Anclora Talent')
    expect(TALENT_BRAND.logoPath).toBe('/brand/logo-anclora-talent.png')
    expect(TALENT_BRAND.faviconPath).toBe('/favicon.ico')
    expect(TALENT_BRAND.premiumAccent).toBe('#4A9FD8')
    expect(TALENT_BRAND.premiumSecondary).toBe('#A0D0F0')
    expect(TALENT_BRAND.premiumInterior).toBe('#141E28')
    expect(TALENT_BRAND.premiumCopper).toBe('#C07860')
    expect(TALENT_BRAND.premiumTypography).toBe('DM Sans')
  })
})
