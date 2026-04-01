export type MarketingCta = {
  href: string;
  label: string;
};

export function getPrimaryCta(userId: string | null): MarketingCta {
  if (userId) {
    return {
      href: '/dashboard',
      label: 'Ir al dashboard',
    };
  }

  return {
    href: '/sign-up',
    label: 'Crear cuenta',
  };
}

export function getSecondaryCta(userId: string | null): MarketingCta | null {
  if (userId) {
    return null;
  }

  return {
    href: '#product-showcase',
    label: 'Ver como funciona',
  };
}
