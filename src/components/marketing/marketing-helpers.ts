import type { MarketingNav } from './marketing-data';

export type MarketingCta = {
  href: string;
  label: string;
};

export function getPrimaryCta(userId: string | null, nav: Pick<MarketingNav, 'dashboard' | 'signUp'>): MarketingCta {
  if (userId) {
    return {
      href: '/dashboard',
      label: nav.dashboard,
    };
  }

  return {
    href: '/sign-up',
    label: nav.signUp,
  };
}

export function getSecondaryCta(userId: string | null, nav: Pick<MarketingNav, 'signIn'>): MarketingCta | null {
  if (userId) {
    return null;
  }

  return {
    href: '/sign-in',
    label: nav.signIn,
  };
}
